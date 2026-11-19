import importlib.util
import struct
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "public" / "training" / "omniverse_train.py"
SPEC = importlib.util.spec_from_file_location("omniverse_train", SCRIPT)
ENGINE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ENGINE)

def make_nxs(payload=b"hello", marker=1):
    escaped=payload.replace(b"\xff",b"\xff\xff")
    seq=b"\xff\xfe"+b"metadata"+bytes([255,marker])+escaped+b"\xff\x00"
    return struct.pack("<I",len(seq))+seq

class NxsParserTests(unittest.TestCase):
    def test_parses_text_sequence(self):
        result=ENGINE.parse_nxs(make_nxs())
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]["segments"][0]["modality"],"think")
        self.assertEqual(result[0]["segments"][0]["data"],b"hello")
    def test_unescapes_ff(self):
        result=ENGINE.parse_nxs(make_nxs(b"a\xffb"))
        self.assertEqual(result[0]["segments"][0]["data"],b"a\xffb")
    def test_rejects_empty(self):
        with self.assertRaises(ValueError): ENGINE.parse_nxs(b"")
    def test_rejects_truncated_length(self):
        with self.assertRaises(ValueError): ENGINE.parse_nxs(b"\x08\x00")
    def test_rejects_bad_bos(self):
        seq=b"\x00\x00xx\xff\x01x\xff\x00"
        with self.assertRaises(ValueError): ENGINE.parse_nxs(struct.pack("<I",len(seq))+seq)
    def test_rejects_unknown_marker(self):
        seq=b"\xff\xfe\xff\x09x\xff\x00"
        with self.assertRaises(ValueError): ENGINE.parse_nxs(struct.pack("<I",len(seq))+seq)
    def test_vision_excluded_from_text(self):
        result=ENGINE.parse_nxs(make_nxs(b"\x01\x02\x03",5))
        self.assertEqual(ENGINE.extract_text_records(result),[])

if __name__=="__main__": unittest.main()
