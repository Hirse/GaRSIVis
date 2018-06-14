import unittest

from preprocess import bin_fixations, merge_overlapping_times, trim_times


class BinningTest(unittest.TestCase):
    def test_single(self) -> None:
        self.assertEqual([[{
            'start': 1,
            'end': 10
        }]], bin_fixations([{
            'start': 1,
            'end': 10
        }]))

    def test_same_second(self) -> None:
        self.assertEqual([[{
            'start': 1,
            'end': 200
        }, {
            'start': 220,
            'end': 500
        }]], bin_fixations([{
            'start': 1,
            'end': 200
        }, {
            'start': 220,
            'end': 500
        }]))

    def test_separate_second(self) -> None:
        self.assertEqual([[{
            'start': 1,
            'end': 200
        }], [{
            'start': 1220,
            'end': 1500
        }]], bin_fixations([{
            'start': 1,
            'end': 200
        }, {
            'start': 1220,
            'end': 1500
        }]))

    def test_sparse(self) -> None:
        self.assertEqual([[{
            'start': 1,
            'end': 200
        }], [], [{
            'start': 2220,
            'end': 2500
        }]], bin_fixations([{
            'start': 1,
            'end': 200
        }, {
            'start': 2220,
            'end': 2500
        }]))

    def test_floor(self) -> None:
        self.assertEqual([[{
            'start': 1,
            'end': 2
        }], [{
            'start': 1998,
            'end': 1999
        }]], bin_fixations([{
            'start': 1,
            'end': 2
        }, {
            'start': 1998,
            'end': 1999
        }]))


class MergeTimesTest(unittest.TestCase):
    def test_single(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 10,
            'comment': ""
        }], merge_overlapping_times([{
            'start': 1,
            'end': 10,
            'comment': ""
        }]))

    def test_sequential(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 200,
            'comment': ""
        }, {
            'start': 220,
            'end': 500,
            'comment': ""
        }], merge_overlapping_times([{
            'start': 1,
            'end': 200,
            'comment': ""
        }, {
            'start': 220,
            'end': 500,
            'comment': ""
        }]))

    def test_overlapping(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 500,
            'comment': 'first, second'
        }], merge_overlapping_times([{
            'start': 1,
            'end': 200,
            'comment': "first"
        }, {
            'start': 100,
            'end': 500,
            'comment': "second"
        }]))

    def test_many_overlapping(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 500,
            'comment': 'first, second, third'
        }], merge_overlapping_times([{
            'start': 1,
            'end': 200,
            'comment': "first"
        }, {
            'start': 100,
            'end': 500,
            'comment': "second"
        }, {
            'start': 150,
            'end': 400,
            'comment': "third"
        }]))

    def test_larger(self) -> None:
        self.assertEqual([{
            "start": 0,
            "end": 1
        }, {
            "start": 5298,
            "end": 6484,
            'comment': 'first, second'
        }], merge_overlapping_times([{
            "start": 0,
            "end": 1
        }, {
            "start": 5298,
            "end": 6484,
            'comment': "first"
        }, {
            "start": 6480,
            "end": 6483,
            'comment': "second"
        }]))


class TrimTimesTest(unittest.TestCase):
    def test_in(self) -> None:
        self.assertEqual([{
            'start': 1,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], trim_times([{
            'start': 1,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], 0, 11))

    def test_start(self) -> None:
        self.assertEqual([{
            'start': 2,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], trim_times([{
            'start': 1,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], 2, 11))

    def test_end(self) -> None:
        self.assertEqual([{
            'start': 0,
            'end': 9,
            'class': "stripped",
            'comment': ""
        }], trim_times([{
            'start': 0,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], 0, 9))

    def test_out(self) -> None:
        self.assertEqual([], trim_times([{
            'start': 3,
            'end': 10,
            'class': "stripped",
            'comment': ""
        }], 0, 2))


if __name__ == '__main__':
    unittest.main()
