from json import dump, load
from os import listdir, makedirs
from os.path import join, isfile, splitext
from statistics import mean
from typing import List, Tuple, Dict, Union

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.utils import shuffle


def load_others(excluded_session_name: str) -> Tuple[List, List, List]:
    x = []
    y = []
    w = []
    chunk_folder = join('data', 'chunks')
    for file_name in listdir(chunk_folder):
        if isfile(join(chunk_folder, file_name)):
            session_name = splitext(file_name)[0]
            if session_name != excluded_session_name:
                session_x, session_y, session_w = load_session(session_name)
                x.extend(session_x)
                y.extend(session_y)
                w.extend(session_w)
    return shuffle(x, y, w)


def load_session(session_name: str) -> Tuple[List, List, List]:
    x = []
    y = []
    with open(join('data', 'chunks', session_name + '.json'), encoding='utf8') as session_file:
        session = load(session_file)
    for chunk in session:
        y.append(1 if chunk['interruption'] else 0)
        x.append([
            chunk['fixations']['count'],
            chunk['fixations']['duration']['avg'],
            chunk['fixations']['duration']['med'],
            chunk['fixations']['duration']['var'],
            chunk['saccades']['duration']['avg'],
            chunk['saccades']['duration']['med'],
            chunk['saccades']['duration']['var'],
            chunk['saccades']['length']['avg'],
            chunk['saccades']['length']['med'],
            chunk['saccades']['length']['var'],
            chunk['saccades']['angle']['avg'],
            chunk['saccades']['angle']['med'],
            chunk['saccades']['angle']['var'],
        ])
    weight_0 = sum(y)
    weight_1 = len(y) - weight_0
    w = [weight_1 if i else weight_0 for i in y]
    return x, y, w


def predict(session_name: str) -> Dict[str, Union[float, List]]:
    x_train, y_train, w_train = load_others(session_name)
    x_test, y_test, _ = load_session(session_name)
    classifier = LogisticRegression()
    classifier.fit(x_train, y_train, sample_weight=w_train)
    c = classifier.predict(x_test)
    return {
        'accuracy': accuracy_score(y_test, c),
        'precision': precision_score(y_test, c),
        'recall': recall_score(y_test, c),
        'prediction': c.tolist()
    }


def save_prediction(file_name: str) -> None:
    session_name = splitext(file_name)[0]
    result = predict(session_name)
    try:
        makedirs(join('data', 'predictions'))
    except FileExistsError:
        pass
    with open(join('data', 'predictions', file_name), 'w') as result_file:
        dump(result, result_file, indent=2)


def summarize_predictions(chunk_size: int) -> None:
    results = {}
    prediction_folder = join('data', 'predictions')
    for prediction_file_name in listdir(prediction_folder):
        if isfile(join(prediction_folder, prediction_file_name)):
            with open(join(prediction_folder, prediction_file_name), encoding='utf8') as prediction_file:
                result = load(prediction_file)
            del result['prediction']
            for prop in result:
                if prop not in results:
                    results[prop] = []
                results[prop].append(result[prop])
    summary = {
        'chunk_size': chunk_size
    }
    for prop in results:
        summary[prop] = mean(results[prop])
    with open(join('data', 'predictions.json'), 'w') as result_file:
        dump(summary, result_file, indent=2)


if __name__ == '__main__':
    from multiprocessing.pool import Pool
    source_folder = join('data', 'chunks')
    session_files = [f for f in listdir(source_folder) if isfile(join(source_folder, f))]
    pool = Pool(4)
    pool.map(save_prediction, session_files)
    summarize_predictions(5)
