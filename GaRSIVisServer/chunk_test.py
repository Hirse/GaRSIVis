import unittest

from chunk import bin_events_to_chunks, chunk_session, chunk2, get_relative_seconds


class RelativeSecondsTestCase(unittest.TestCase):
    def test_0(self) -> None:
        self.assertEqual(0, get_relative_seconds({
            'start': 0,
            'end': 0
        }, 0))

    def test_1(self) -> None:
        self.assertEqual(1, get_relative_seconds({
            'start': 1001,
            'end': 1002
        }, 0))

    def test_offset(self) -> None:
        self.assertEqual(0, get_relative_seconds({
            'start': 1001,
            'end': 1002
        }, 1000))


class BinTestCase(unittest.TestCase):
    def test_single(self) -> None:
        chunks = [{
            'start': 0,
            'end': 5,
            'interruption': False
        }]
        bin_events_to_chunks([{
            'start': 1001,
            'end': 1100
        }], 0, chunks, 'events')
        self.assertEqual([{
            'start': 0,
            'end': 5,
            'interruption': False,
            'events': [{
                'start': 1001,
                'end': 1100
            }]
        }], chunks)

    def test_offset(self) -> None:
        chunks = [{
            'start': 0,
            'end': 5,
            'interruption': False
        }]
        bin_events_to_chunks([{
            'start': 1001,
            'end': 1100
        }], 1000, chunks, 'events')
        self.assertEqual([{
            'start': 0,
            'end': 5,
            'interruption': False,
            'events': [{
                'start': 1001,
                'end': 1100
            }]
        }], chunks)

    def test_outside(self) -> None:
        chunks = [{
            'start': 5,
            'end': 10,
            'interruption': False
        }]
        bin_events_to_chunks([{
            'start': 1001,
            'end': 1100
        }], 0, chunks, 'events')
        self.assertEqual([{
            'start': 5,
            'end': 10,
            'interruption': False,
            'events': []
        }], chunks)

    def test_sparse(self) -> None:
        chunks = [{
            'start': 1,
            'end': 5,
            'interruption': False
        }, {
            'start': 12,
            'end': 17,
            'interruption': False
        }]
        bin_events_to_chunks([{
            'start': 12001,
            'end': 12100
        }], 0, chunks, 'events')
        self.assertEqual([{
            'start': 1,
            'end': 5,
            'interruption': False,
            'events': []
        }, {
            'start': 12,
            'end': 17,
            'interruption': False,
            'events': [{
                'start': 12001,
                'end': 12100
            }]
        }], chunks)


class Chunk2TestCase(unittest.TestCase):
    def test_exact_fit(self) -> None:
        self.assertEqual([{
            'start': 0,
            'end': 5,
            'interruption': False
        }], chunk2(0, 5, 5, False))

    def test_smaller(self) -> None:
        self.assertEqual([], chunk2(0, 4, 5, False))

    def test_bigger(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 6,
            'interruption': False
        }], chunk2(0, 6, 5, False))

    def test_interruption(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 6,
            'interruption': False
        }, {
            'start': 6,
            'end': 11,
            'interruption': True
        }], chunk2(0, 11, 5, True))


class ChunkTestCase(unittest.TestCase):
    def test_exact_fit(self) -> None:
        self.assertEqual([{
            'start': 0,
            'end': 5,
            'interruption': False
        }], chunk_session(5, 5, [], []))

    def test_smaller(self) -> None:
        self.assertEqual([], chunk_session(4, 5, [], []))

    def test_bigger(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 6,
            'interruption': False
        }], chunk_session(6, 5, [], []))

    def test_interruption(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 6,
            'interruption': False
        }, {
            'start': 6,
            'end': 11,
            'interruption': True
        }], chunk_session(11, 5, [], [{
            'timestamp': 11
        }]))

    def test_interruptions(self) -> None:
        self.assertEqual([{
            'start': 3,
            'end': 8,
            'interruption': True
        }, {
            'start': 12,
            'end': 17,
            'interruption': True
        }], chunk_session(20, 5, [], [{
            'timestamp': 8
        }, {
            'timestamp': 17
        }]))

    def test_all_ignored(self) -> None:
        self.assertEqual([], chunk_session(20, 5, [{
            'start': 3,
            'end': 16
        }], []))

    def test_some_ignored(self) -> None:
        self.assertEqual([{
            'start': 0,
            'end': 5,
            'interruption': False
        }, {
            'start': 5,
            'end': 10,
            'interruption': False
        }], chunk_session(20, 5, [{
            'start': 10,
            'end': 16
        }], []))

    def test_ignored_interruption(self) -> None:
        self.assertEqual([], chunk_session(11, 5, [{
            'start': 0,
            'end': 8
        }], [{
            'timestamp': 10
        }]))


if __name__ == '__main__':
    unittest.main()
