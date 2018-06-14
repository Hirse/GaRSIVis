from json import load, dump
from math import ceil, floor
from multiprocessing.pool import Pool
from os import listdir, makedirs
from os.path import join, isfile
from statistics import mean, median, variance
from typing import Dict, List


def get_relative_seconds(event: Dict, start: int) -> int:
    """
    Get the middle value of an event as seconds relative to the start.
    :param event: Event with start and end as absolute ms
    :param start: Absolute ms as offset
    :return: Second of the middle of the event, relative to start
    """
    return int(floor((event['start'] + (event['end'] - event['start']) / 2 - start) / 1000))


def bin_events_to_chunks(events: List[Dict], start: int, chunks: List[Dict], event_name: str) -> None:
    """
    Distribute events to chunks in place.
    :param events: List of events with start and end as absolute ms
    :param start: Absolute ms as offset
    :param chunks: List of relevant chunks with start and end as relative second values
    :param event_name: Name of event property
    """
    i = 0
    for chunk in chunks:
        chunk[event_name] = []
        time_s = get_relative_seconds(events[i], start)
        while time_s < chunk['start'] and i < len(events):
            i += 1
            if i == len(events):
                break
            time_s = get_relative_seconds(events[i], start)
        while time_s < chunk['end'] and i < len(events):
            chunk[event_name].append(events[i])
            i += 1
            if i == len(events):
                break
            time_s = get_relative_seconds(events[i], start)


def add_features_to_chunk(chunks: List) -> None:
    """
    Replace fixations and saccades in a chunk with the calculated features in place.
    :param chunks: List of chunks with fixations and saccades
    """
    for chunk in chunks:
        durations = [fixation['end'] - fixation['start'] for fixation in chunk['fixations']]
        chunk['fixations'] = {
            'duration': {
                'avg': mean(durations) if len(durations) else 0,
                'med': median(durations) if len(durations) else 0,
                'min': min(durations) if len(durations) else 0,
                'max': max(durations) if len(durations) else 0,
                'var': variance(durations) if len(durations) > 1 else 0
            },
            'count': len(chunk['fixations'])
        }
        durations = [saccade['end'] - saccade['start'] for saccade in chunk['saccades']]
        lengths = [saccade['length'] for saccade in chunk['saccades']]
        angles = [saccade['angle'] for saccade in chunk['saccades']]
        chunk['saccades'] = {
            'duration': {
                'avg': mean(durations) if len(durations) else 0,
                'med': median(durations) if len(durations) else 0,
                'min': min(durations) if len(durations) else 0,
                'max': max(durations) if len(durations) else 0,
                'var': variance(durations) if len(durations) > 1 else 0
            },
            'length': {
                'avg': mean(lengths) if len(lengths) else 0,
                'med': median(lengths) if len(lengths) else 0,
                'min': min(lengths) if len(lengths) else 0,
                'max': max(lengths) if len(lengths) else 0,
                'var': variance(lengths) if len(lengths) > 1 else 0
            },
            'angle': {
                'avg': mean(angles) if len(angles) else 0,
                'med': median(angles) if len(angles) else 0,
                'min': min(angles) if len(angles) else 0,
                'max': max(angles) if len(angles) else 0,
                'var': variance(angles) if len(angles) > 1 else 0
            },
            'count': len(chunk['saccades'])
        }


def chunk2(start: int, end: int, chunk_size: int, interruption: bool) -> List[Dict]:
    """
    Chunk time duration into segments with a given length.
    :param start: Start of the time segment
    :param end: End of the time segment
    :param chunk_size: Size of each chunk
    :param interruption: Flag whether the last segment ends with an interruption
    :return: List of chunks with start, end, and interruption flag
    """
    if end - start < chunk_size:
        return []
    return chunk2(start, end - chunk_size, chunk_size, False) + [{
        'start': end - chunk_size,
        'end': end,
        'interruption': interruption
    }]


def chunk_session(length: int, chunk_size: int, ignored: List[Dict], interruptions: List[Dict]) -> List:
    """
    Chunk a reading into chunks of relevant time.
    All times are seconds relative to the start.
    :param length: Length of reading in seconds
    :param chunk_size: Chunk size in seconds
    :param ignored: List of ignored segments with start and end as seconds
    :param interruptions: List of interruption events with timestamp as seconds
    :return: List of chunks with start, end, and interruption flag
    """
    current = 0
    i = 0
    j = 0
    chunks = []
    while current < length:
        if i < len(ignored) and j < len(interruptions):
            next_event = min(ignored[i]['start'], interruptions[j]['timestamp'])
            is_interruption = interruptions[j]['timestamp'] <= ignored[i]['start']
        elif i < len(ignored):
            next_event = ignored[i]['start']
            is_interruption = False
        elif j < len(interruptions):
            next_event = interruptions[j]['timestamp']
            is_interruption = True
        else:
            chunks.extend(chunk2(current, length, chunk_size, False))
            break
        if current < next_event:
            chunks.extend(chunk2(current, next_event, chunk_size, is_interruption))
        if is_interruption:
            current = next_event
            j += 1
        else:
            current = ignored[i]['end']
            i += 1
    return chunks


def featurize(session_name: str, chunk_size: int, save=False) -> List[Dict]:
    """
    Chunk and calculate the features for a given session.
    :param session_name: File name of the session
    :param chunk_size: Size of each chunk in seconds
    :return: List of chunks with fixation and saccade features
    """
    source_folder = join('data', 'combined')
    with open(join(source_folder, session_name), encoding='utf8') as parsed_file:
        session = load(parsed_file)
    start, end = session['fixations'][0]['start'], session['fixations'][-1]['end']
    length = int(ceil((end - start) / 1000))
    chunks = chunk_session(length, chunk_size, session['ignored'], session['interruptions'])
    bin_events_to_chunks(session['fixations'], start, chunks, 'fixations')
    bin_events_to_chunks(session['saccades'], start, chunks, 'saccades')
    add_features_to_chunk(chunks)
    if save:
        try:
            makedirs(join('data', 'chunks'))
        except FileExistsError:
            pass
        with open(join('data', 'chunks', session_name), 'w') as target:
            dump(chunks, target, indent=2)
    return chunks


def featurize_all(chunk_size: int) -> None:
    """
    Featurize all sessions and save the results as files.
    :param chunk_size: Size of each chunk in seconds
    """
    source_folder = join('data', 'combined')
    source_files = [f for f in listdir(source_folder) if isfile(join(source_folder, f))]
    pool = Pool(4)
    results = pool.starmap(featurize, [(filename, chunk_size) for filename in source_files])
    pool.close()
    pool.join()

    try:
        makedirs(join('data', 'chunks'))
    except FileExistsError:
        pass
    for i, filename in enumerate(source_files):
        print(filename)
        with open(join('data', 'chunks', filename), 'w') as target:
            dump(results[i], target, indent=2)


def main() -> None:
    featurize_all(5)


if __name__ == '__main__':
    main()
