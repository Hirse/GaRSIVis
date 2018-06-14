from json import dump, load, loads, dumps
from multiprocessing.pool import Pool
from operator import itemgetter
from os import listdir
from os.path import join, isfile, splitext
from typing import List

from autobahn.twisted.websocket import WebSocketServerProtocol

from chunk import featurize
from predict import save_prediction,summarize_predictions
from preprocess import merge_overlapping_times


with open(join('data', 'state.json'), encoding='utf8') as state_read:
    state = load(state_read)


def on_error(e: Exception) -> None:
    print(e)

def write_state() -> None:
    with open(join('data', 'state.json'), 'w') as state_write:
        dump(state, state_write, indent=2)


def merge_annotations(session_name: str, annotations: List) -> None:
    with open(join('data', 'combined', session_name + '.json'), encoding='utf8') as session_file:
        session = load(session_file)
    annotations.extend(session['ignored'])
    annotations.sort(key=itemgetter('start'))
    merged_annotations = merge_overlapping_times(annotations)
    session['ignored'] = merged_annotations
    with open(join('data', 'combined', session_name + '.json'), 'w') as session_file:
        dump(session, session_file, indent=2)

    with open(join('data', 'preprocessed', session_name + '.json'), encoding='utf8') as session_file:
        session = load(session_file)
    session['ignored'] = merged_annotations
    with open(join('data', 'preprocessed', session_name + '.json'), 'w') as session_file:
        dump(session, session_file, indent=2)


def featurize_session(session_name: str, chunk_size: int) -> str:
    featurize(session_name + '.json', chunk_size, True)
    return session_name


def predict(session_name: str) -> str:
    save_prediction(session_name + '.json')
    return session_name


class MyServerProtocol(WebSocketServerProtocol):
    def __init__(self):
        super().__init__()
        self.pool = Pool(4)

    def sendJSON(self, message_type: str, payload: any):
        message = dumps({
            'type': message_type,
            'payload': payload
        })
        self.sendMessage(message.encode())

    def onMessage(self, payload, isBinary):
        request_data = loads(payload.decode('utf8'))

        if request_data['type'] == 'annotations':
            print('annotations - start')
            session_name = request_data['session']
            state['ignored'][session_name] = False
            state['chunks'][session_name] = False
            for ps in state['prediction']:
                state['prediction'][ps] = False
            state['prediction_summary'] = False
            write_state()
            self.sendJSON("ACK", "annotations")
            self.sendJSON("predict", False)
            self.sendJSON("prediction_summary", {
                'valid': False
            })
            self.sendJSON("ignored", {
                'session': session_name,
                'valid': False
            })
            self.sendJSON("chunk", {
                'session': session_name,
                'valid': False
            })
            for ps in state['prediction']:
                self.sendJSON("predict", {
                    'session': ps,
                    'valid': False
                })
            self.pool.apply_async(merge_annotations, [session_name, request_data['annotations']],
                                  callback=lambda _: self.after_merge_annotations(session_name), error_callback=on_error)
            print('annotations - done')

        elif request_data['type'] == 'chunkSize':
            state['chunk_size'] = request_data['chunkSize']
            state['prediction_summary'] = False
            for session in state['chunks']:
                state['chunks'][session] = False
                state['prediction'][session] = False
            write_state()
            self.sendJSON("ACK", "chunkSize")
            self.sendJSON("prediction_summary", {
                'valid': False
            })
            for session_name in state['chunks']:
                self.sendJSON("chunk", {
                    'session': session_name,
                    'valid': False
                })
                self.sendJSON("predict", {
                    'session': session_name,
                    'valid': False
                })
                print('chunk - start - ' + session_name)
                self.pool.apply_async(featurize_session, [session_name, state['chunk_size']],
                                      callback=lambda x: self.after_featurize_session(x), error_callback=on_error)

        elif request_data['type'] == 'state':
            print('state')
            self.sendJSON("state", state)

    def after_merge_annotations(self, session_name: str) -> None:
        state['ignored'][session_name] = True
        write_state()
        self.sendJSON("ignored", {
            'session': session_name,
            'valid': True
        })
        self.pool.apply_async(featurize_session, [session_name, state['chunk_size']],
                              callback=lambda _: self.after_featurize_session(session_name), error_callback=on_error)

    def after_featurize_session(self, session_name: str) -> None:
        print('chunk - done - '+ session_name)
        state['chunks'][session_name] = True
        write_state()
        self.sendJSON("chunk", {
            'session': session_name,
            'valid': True
        })
        ready_for_prediction = True
        for session in state['chunks']:
            ready_for_prediction = ready_for_prediction and state['chunks'][session]
        if ready_for_prediction:
            for session in state['chunks']:
                print('predict - start - ' + session)
                self.pool.apply_async(predict, [session],
                                      callback=lambda x: self.after_predict(x), error_callback=on_error)

    def after_predict(self, session_name: str) -> None:
        print('predict - done - ' + session_name)
        state['prediction'][session_name] = True
        write_state()
        self.sendJSON("predict", {
            'session': session_name,
            'valid': True
        })
        predictions_done = True
        for session in state['prediction']:
            predictions_done = predictions_done and state['prediction'][session]
        if predictions_done:
            print('predict - summarize')
            self.pool.apply_async(summarize_predictions, [state['chunk_size']],
                                  callback=lambda _: self.after_summary(), error_callback=on_error)

    def after_summary(self) -> None:
        state['prediction_summary'] = True
        write_state()
        self.sendJSON("prediction_summary", {
            'valid': True
        })


if __name__ == '__main__':
    import sys

    from twisted.python import log
    from twisted.internet import reactor

    log.startLogging(sys.stdout)

    from autobahn.twisted.websocket import WebSocketServerFactory

    factory = WebSocketServerFactory()
    factory.protocol = MyServerProtocol

    reactor.listenTCP(3002, factory)
    reactor.run()
