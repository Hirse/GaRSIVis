from datetime import datetime
from itertools import tee
from hashlib import md5
from json import dumps, load
from math import ceil, floor, sqrt, atan2, degrees
from operator import itemgetter
from os import listdir, makedirs
from os.path import isdir, isfile, join, splitext
from re import match
from typing import Dict, List, TextIO, Tuple

from humanhash import humanize

from smallestenclosingcircle import make_circle


SOURCE_FOLDER = 'sessions'
RESULT_FOLDER = 'data'
PARSED_FOLDER = join(RESULT_FOLDER, 'parsed')
FIXATION_FOLDER = join(RESULT_FOLDER, 'fixation')
SACCADE_FOLDER = join(RESULT_FOLDER, 'saccade')
TIME_FOLDER = join(RESULT_FOLDER, 'time')
COMBINED_FOLDER = join(RESULT_FOLDER, 'combined')
PREPROCESSED_FOLDER = join(RESULT_FOLDER, 'preprocessed')

T_I = 5000  # duration of interest in ms
T_L = 0  # interruption lag
T_R = 3000  # resumption lag in ms


def pairwise(iterable):
    """s -> (s0,s1), (s1,s2), (s2, s3), ..."""
    a, b = tee(iterable)
    next(b, None)
    return zip(a, b)


def parse_timestamp(timestamp: str) -> int:
    date = datetime.strptime(timestamp, '%Y-%m-%dT%H:%M:%S.%fZ')
    return int(date.timestamp() * 1000)


def parse_open_args(args: List[str]) -> Dict:
    return {
        'document': args[0]
    }


def parse_scroll_args(args: List[str]) -> Dict:
    return {
        'px_before': float(args[0].split('->')[0]),
        'px_after': float(args[0].split('->')[1]),
        '%_before': float(args[1].split('->')[0][:-1]),
        '%_after': float(args[1].split('->')[1][:-1]),
    }


def parse_zoom_args(args: List[str]) -> Dict:
    str_before, str_after = args[0].split('->')
    try:
        before = float(str_before)
    except ValueError:
        before = str_before
    try:
        after = float(str_after)
    except ValueError:
        after = str_after
    return {
        'factor_before': before,
        'factor_after': after
    }


def parse_active_args(args: List[str]) -> Dict:
    return {
        'app_id': args[0],
        'app_title': args[1]
    }


def parse_reason_args(args: List[str]) -> Dict:
    return {
        'reason': args[0]
    }


def parse_fixation_args(args: List[str]) -> Dict:
    return {
        'x': float(args[0].split(',')[0]),
        'y': float(args[0].split(',')[1]),
        'rel_x': float(args[1].split(',')[0][:-1]),
        'rel_y': float(args[1].split(',')[1][:-1]),
        'text': args[2]
    }


def parse_head_args(args: List[str]) -> Dict:
    return {
        'x': float(args[0].split(',')[0]),
        'y': float(args[0].split(',')[1]),
        'z': float(args[0].split(',')[2]),
        'rot_x': float(args[1].split(',')[0]),
        'rot_y': float(args[1].split(',')[1]),
        'rot_z': float(args[1].split(',')[2])
    }


def parse_event_args(event_type: str, args: List[str]) -> Dict:
    if event_type == 'OPEN':
        return parse_open_args(args)
    elif event_type == 'SCROLL':
        return parse_scroll_args(args)
    elif event_type == 'ZOOM':
        return parse_zoom_args(args)
    elif event_type == 'ACTIVE':
        return parse_active_args(args)
    elif event_type == 'REASON':
        return parse_reason_args(args)
    elif event_type == 'GAZE':
        return parse_fixation_args(args)
    elif event_type == 'FIXATIONSTART':
        return parse_fixation_args(args)
    elif event_type == 'FIXATIONDATA':
        return parse_fixation_args(args)
    elif event_type == 'FIXATIONEND':
        return parse_fixation_args(args)
    elif event_type == 'HEAD':
        return parse_head_args(args)
    else:
        return {}


def parse_event(event: str) -> Dict:
    event = event.strip()
    sections = event.split('|')
    if sections[2] != '[hidden]':
        return {
            'timestamp': parse_timestamp(sections[0]),
            'type': sections[1],
            'args': parse_event_args(sections[1], sections[2].split(';'))
        }


def parse_session(session_file: TextIO) -> List:
    return [parsed for parsed in (parse_event(line) for line in session_file) if parsed]


def normalize_events(events: List) -> List:
    """
    Normalize events with regard to the coordinates.
    :param events: List of parsed events
    :returns: List of normalized, parsed events
    """
    # zoom_factor = 1.0
    scroll_offset = 0
    for event in events:
        if event['type'] == 'SCROLL':
            scroll_offset = event['args']['px_after']
        # elif event['type'] == 'ZOOM':
        #     try:
        #         factor_before = float(event['args']['factor_before'])
        #         factor_after = float(event['args']['factor_after'])
        #         zoom_factor *= factor_after / factor_before
        #     except ValueError as _:
        #         pass
        elif event['type'].startswith('FIXATION') or event['type'] == 'GAZE':
            if 'y' not in event['args']:
                print(event)
                exit()
            event['args']['y'] += scroll_offset
    return events


def merge_fixations(events: List) -> List:
    """
    Merge fixation start, data, and end point events into fixation events with a duration.
    :param events: List of parsed events of any type
    :returns: List of merged fixation events
    """
    fixations = []
    current_fixation = {
        'start': None,
        'end': None,
        'points': [],
        'circle': None
    }
    started = False
    for event in events:
        if event['type'] == 'FIXATIONSTART':
            started = True
            point = (event['args']['x'], event['args']['y'])
            current_fixation['start'] = event['timestamp']
            current_fixation['points'] = [point]
        elif started and event['type'] == 'FIXATIONDATA':
            point = (event['args']['x'], event['args']['y'])
            current_fixation['points'].append(point)
        elif started and event['type'] == 'FIXATIONEND':
            started = False
            current_fixation['end'] = event['timestamp']
            point = (event['args']['x'], event['args']['y'])
            current_fixation['points'].append(point)
            circle = [round(c, 2) for c in make_circle(current_fixation['points'])]
            current_fixation['circle'] = circle
            fixations.append(current_fixation)
            current_fixation = {}
    return fixations


def bin_events(events: List, start: int, end: int) -> List:
    """
    Bin the given events by second.
    :param events: List of events with start and end
    :param start: Start of the event time, corresponds to bin 0
    :param end: End of the event time, corresponds to the last bin
    :return:
    """
    end_s = int(ceil((end - start) / 1000))
    bins = [[] for _ in range(end_s)]
    for event in events:
        time_s = int(floor((event['start'] + (event['end'] - event['start']) / 2 - start) / 1000))
        bins[time_s].append(event)
    return bins


def bin_fixations(fixations: List) -> List:
    """
    Bin fixations by second.
    :param fixations: List of merged fixation events
    :return: List of fixations per second
    """
    return bin_events(fixations, fixations[0]['start'], fixations[-1]['end'])


def get_saccades(fixations: List) -> List:
    """
    Calculate saccades from merged fixation events.
    :param fixations: List of merged fixation events
    :return: List of saccade events
    """
    saccades = []
    for fixation, next_fixation in pairwise(fixations):
        o_x, o_y = fixation['circle'][0], fixation['circle'][1]
        d_x, d_y = next_fixation['circle'][0], next_fixation['circle'][1]
        center_distance = sqrt((o_x - d_x) ** 2 + (o_y - d_y) ** 2)
        radius_distance = center_distance - fixation['circle'][2] - next_fixation['circle'][2]
        angle = atan2(d_y - o_y, d_x - o_x)
        saccades.append({
            'start': fixation['end'],
            'end': next_fixation['start'],
            'origin': (o_x, o_y),
            'destination': (d_x, d_y),
            'length': center_distance,
            'radius_length': radius_distance,
            'angle': degrees(angle)
        })
    return saccades


def bin_saccades(saccades: List, fixations: List) -> List:
    """
    Bin saccades by second
    :param saccades: List of saccade events to be binned
    :param fixations: List of fixation events, required for the time context
    :return: List of saccades per second
    """
    return bin_events(saccades, fixations[0]['start'], fixations[-1]['end'])


def classify_times(events: List) -> Tuple[List, List]:
    """
    Classify the time segments of a list of events.
    The first and last couple of events are stripped.
    Times of interest before an interruption are marked.
    The time after an interruptions until reading is resumed is stripped.
    :param events: List of parsed events
    :returns: List of time durations with classification
    """
    last_gaze_timestamp = None
    ignoring_until = None
    reason = None
    active_windows = []
    ignored_times = []
    interruptions = []
    state = 'before'
    for event in events:
        if event['type'] == 'OPEN':
            # If this is the first OPEN, ignore everything before
            # Otherwise only ignore time since the last gaze
            ignoring_until = event['timestamp'] + T_R
            ignored_times.append({
                'start': last_gaze_timestamp if last_gaze_timestamp else events[0]['timestamp'],
                'end': ignoring_until,
                'class': "stripped",
                'comment': "Before and shortly after open"
            })
            state = 'reading'
        elif state == 'reading' and match('(?:GAZE|FIXATION)', event['type']):
            if not ignoring_until or ignoring_until < event['timestamp']:
                last_gaze_timestamp = event['timestamp']
        elif state == 'reading' and event['type'] == 'BLUR':
            state = 'blurred'
        elif state == 'blurred' and event['type'] == 'ACTIVE':
            active_windows.append(event['args'])
        elif event['type'] == 'REASON':
            reason = event['args']['reason']
        elif state == 'blurred' and event['type'] == 'FOCUS':
            ignoring_until = event['timestamp'] + T_R
            if last_gaze_timestamp:
                if reason == 'interruption':  # ext. interruptions don't affect previous gazes
                    classification = "normal"
                else:
                    classification = "target"

                if T_L:
                    ignored_times.append({
                        'start': last_gaze_timestamp - T_L,
                        'end': last_gaze_timestamp,
                        'class': "stripped",
                        'comment': "Interruption lag"
                    })
                ignored_times.append({
                    'start': last_gaze_timestamp,
                    'end': ignoring_until,
                    'class': "stripped",
                    'comment': "Non-reading time"
                })
                interruptions.append({
                    'timestamp': last_gaze_timestamp - T_L,
                    'class': classification,
                    'reason': reason,
                    'active': active_windows
                })
                last_gaze_timestamp = None
            reason = None
            active_windows = []
            state = 'reading'
    ignored_times.append({
        'start': max((last_gaze_timestamp or 0) - T_R, ignored_times[-1]['end']),
        'end': events[-1]['timestamp'],
        'class': "stripped",
        'comment': "Ignore last gazes"
    })

    ignored_times.sort(key=itemgetter('start'))
    return merge_overlapping_times(ignored_times), interruptions


def merge_overlapping_times(ignored_times: List) -> List:
    """
    Merge overlapping ignored times.
    :param ignored_times: List of ignored time segments
    :return: List of ignored time segments with overlapping segments merged
    """
    merged_ignored_times = [ignored_times[0]]
    for time in ignored_times[1:]:
        if time['start'] < merged_ignored_times[-1]['end']:
            merged_ignored_times[-1]['end'] = max(time['end'], merged_ignored_times[-1]['end'])
            merged_ignored_times[-1]['comment'] += ", " + time['comment']
        else:
            merged_ignored_times.append(time)
    return merged_ignored_times


def trim_times(ignored_times: List, fixations_start: int, fixations_end: int):
    """
    Trim the ignored times based on available fixation data.
    Ignored times start with the first fixation and end with the last.
    :param ignored_times: List of ignored time segments
    :param fixations_start: Start of the first fixation
    :param fixations_end: End of the last fixation
    :return:
    """
    trimmed_times = []
    for time in ignored_times:
        if time['end'] > fixations_start and time['start'] < fixations_end:
            trimmed_times.append({
                'start': max(time['start'], fixations_start),
                'end': min(time['end'], fixations_end),
                'class': time['class'],
                'comment': time['comment']
            })
    return trimmed_times


def get_relative_times(ignored_times: List, fixations_start: int):
    """
    Turn the absolute timestamps of the ignored segments into relative times.
    :param ignored_times: List of ignored time segments
    :param fixations_start: Start of the first fixation, base for relative time
    :return: List of ignored time segments with relative timestamps
    """
    relative_times = []
    for time in ignored_times:
        relative_times.append({
            'start': floor((time['start'] - fixations_start) / 1000),
            'end': floor((time['end'] - fixations_start) / 1000),
            'class': time['class'],
            'comment': time['comment']
        })
    return relative_times


def get_relative_interruptions(interruptions: List, fixations_start: int) -> List:
    """
    Turn the absolute timestamps of the interruptions into relative ones.
    :param interruptions: List of interruptions
    :param fixations_start: Start of the first fixation, base for relative time
    :return: List of interruptions with relative timestamps
    """
    relative_interruptions = []
    for interruption in interruptions:
        relative_interruptions.append({
            'timestamp': floor((interruption['timestamp'] - fixations_start) / 1000),
            'class': interruption['class'],
            'reason': interruption['reason'],
            'active': interruption['active'].copy(),
        })
    return relative_interruptions


# Meta file operations
def list_sessions() -> None:
    """
    List the session files and save the list of hashed ids.
    """
    sessions = []
    user_folders = [f for f in listdir(SOURCE_FOLDER) if isdir(join(SOURCE_FOLDER, f))]
    for user_folder in user_folders:
        user_folder_path = join(SOURCE_FOLDER, user_folder)
        session_files = [f for f in listdir(user_folder_path) if isfile(join(user_folder_path, f))]
        for session_file in session_files:
            session_file = splitext(session_file)[0]
            reading_id = humanize(md5(bytes(session_file, 'utf-8')).hexdigest(), words=2)
            sessions.append(reading_id)
    sessions.sort()
    with open(join(RESULT_FOLDER, 'list.json'), 'w') as list_file:
        print(dumps(sessions, indent=2), file=list_file)


def setup_state() -> None:
    """
    Generate the default state.
    """
    with open(join(RESULT_FOLDER, 'list.json'), encoding='utf-8') as list_file:
        sessions = load(list_file)
    state = {
        'chunk_size': 5,
        'ignored': {},
        'chunks': {},
        'prediction': {},
        'prediction_summary': True
    }
    for session in sessions:
        state['ignored'][session] = True
        state['chunks'][session] = True
        state['prediction'][session] = True

    with open(join(RESULT_FOLDER, 'state.json'), 'w') as state_file:
        print(dumps(state, indent=2), file=state_file)


def map_ids() -> None:
    """
    Save a mapping of the humanized user and reading ids.
    """
    sessions = []
    user_folders = [f for f in listdir(SOURCE_FOLDER) if isdir(join(SOURCE_FOLDER, f))]
    for user_folder in user_folders:
        user_folder_path = join(SOURCE_FOLDER, user_folder)
        session_files = [f for f in listdir(user_folder_path) if isfile(join(user_folder_path, f))]
        for session_file in session_files:
            user_id = humanize(md5(bytes(user_folder, 'utf-8')).hexdigest(), words=1)
            session_file = splitext(session_file)[0]
            reading_id = humanize(md5(bytes(session_file, 'utf-8')).hexdigest(), words=2)
            sessions.append({
                'user': user_folder,
                'user_id': user_id,
                'file': session_file,
                'file_id': reading_id
            })
    with open(join(RESULT_FOLDER, 'map.json'), 'w') as list_file:
        print(dumps(sessions, indent=2), file=list_file)


# IO operations
def read_sessions() -> List:
    """
    Read the raw sessions, parse and normalize the events.
    :returns: List of parsed, normalized sessions
    """
    sessions = []
    user_folders = [f for f in listdir(SOURCE_FOLDER) if isdir(join(SOURCE_FOLDER, f))]
    for user_folder in user_folders:
        user_folder_path = join(SOURCE_FOLDER, user_folder)
        session_files = [f for f in listdir(user_folder_path) if isfile(join(user_folder_path, f))]
        for session_file in session_files:
            with open(join(user_folder_path, session_file), encoding='utf8') as reading_file:
                user_id = humanize(md5(bytes(user_folder, 'utf-8')).hexdigest(), words=1)
                session_file = splitext(session_file)[0]
                reading_id = humanize(md5(bytes(session_file, 'utf-8')).hexdigest(), words=2)
                sessions.append({
                    'user': user_id,
                    'file': reading_id,
                    'events': normalize_events(parse_session(reading_file))
                })
    return sessions


def save_parsed(sessions: List) -> None:
    """
    Save the parsed sessions.
    :param sessions: List of parsed sessions
    """
    for session in sessions:
        try:
            makedirs(PARSED_FOLDER)
        except FileExistsError:
            pass
        parsed_filename = session['file'] + '.json'
        with open(join(PARSED_FOLDER, parsed_filename), 'w') as target:
            print(dumps(session, indent=2), file=target)


def read_parsed() -> List:
    """
    Read the parsed sessions.
    :returns: List of parsed, normalized sessions
    """
    sessions = []
    session_files = [f for f in listdir(PARSED_FOLDER) if isfile(join(PARSED_FOLDER, f))]
    for session_file in session_files:
        with open(join(PARSED_FOLDER, session_file), encoding='utf8') as parsed_file:
            sessions.append(load(parsed_file))
    return sessions


def save_fixations(sessions: List) -> None:
    """
    Save the merged fixations.
    :param sessions: List of parsed sessions
    """
    for session in sessions:
        try:
            makedirs(FIXATION_FOLDER)
        except FileExistsError:
            pass
        parsed_filename = session['file'] + '.json'
        with open(join(FIXATION_FOLDER, parsed_filename), 'w') as target:
            print(dumps({
                'user': session['user'],
                'file': session['file'],
                'fixations': merge_fixations(session['events'])
            }, indent=2), file=target)


def read_fixations() -> List:
    """
    Read the merged fixations.
    :returns: List of sessions with merged fixation events
    """
    sessions = []
    session_files = [f for f in listdir(FIXATION_FOLDER) if isfile(join(FIXATION_FOLDER, f))]
    for session_file in session_files:
        with open(join(FIXATION_FOLDER, session_file), encoding='utf8') as parsed_file:
            sessions.append(load(parsed_file))
    return sessions


def save_times(sessions: List) -> None:
    """
    Save the classified times.
    :param sessions: List of parsed sessions
    """
    for session in sessions:
        try:
            makedirs(TIME_FOLDER)
        except FileExistsError:
            pass
        parsed_filename = session['file'] + '.json'
        with open(join(TIME_FOLDER, parsed_filename), 'w') as target:
            ignored, interruptions = classify_times(session['events'])
            print(dumps({
                'user': session['user'],
                'file': session['file'],
                'ignored': ignored,
                'interruptions': interruptions
            }, indent=2), file=target)


def read_times() -> List:
    """
    Read the classified times.
    :returns: List of sessions with classified times
    """
    sessions = []
    session_files = [f for f in listdir(TIME_FOLDER) if isfile(join(TIME_FOLDER, f))]
    for session_file in session_files:
        with open(join(TIME_FOLDER, session_file), encoding='utf8') as parsed_file:
            sessions.append(load(parsed_file))
    return sessions


def main() -> None:
    try:
        makedirs(RESULT_FOLDER)
    except FileExistsError:
        pass
    list_sessions()
    map_ids()
    setup_state()

    sessions = read_sessions()
    save_parsed(sessions)

    # sessions = read_parsed()
    for session in sessions:
        fixations = merge_fixations(session['events'])
        saccades = get_saccades(fixations)
        fixation_bins = bin_fixations(fixations)
        # saccade_bins = bin_saccades(saccades, fixations)
        ignored_times, interruptions = classify_times(session['events'])
        trimmed_ignored_times = trim_times(ignored_times, fixations[0]['start'], fixations[-1]['end'])
        relative_ignored_times = get_relative_times(trimmed_ignored_times, fixations[0]['start'])
        relative_interruptions = get_relative_interruptions(interruptions, fixations[0]['start'])

        try:
            makedirs(COMBINED_FOLDER)
        except FileExistsError:
            pass
        with open(join(COMBINED_FOLDER, session['file'] + '.json'), 'w') as target:
            print(dumps({
                'fixations': fixations,
                'saccades': saccades,
                'ignored': relative_ignored_times,
                'interruptions': relative_interruptions
            }, indent=2), file=target)

        try:
            makedirs(PREPROCESSED_FOLDER)
        except FileExistsError:
            pass
        with open(join(PREPROCESSED_FOLDER, session['file'] + '.json'), 'w') as target:
            print(dumps({
                'counts': [len(fixation_bin) for fixation_bin in fixation_bins],
                'ignored': relative_ignored_times,
                'interruptions': relative_interruptions
            }, indent=2), file=target)


if __name__ == '__main__':
    main()
