import unittest
from pathlib import Path

from tah_entry_layout import (
    ENTRY_SIZE,
    SPEC_V1_PAYLOAD_SIZE,
    TahEntry,
    TahSpecV1,
    pack_entry,
    pack_spec_v1,
    unpack_entry,
    unpack_spec_v1,
)


GOLDEN_ENTRY_HEX = (
    Path(__file__).resolve().parents[3] / "packages" / "tah-spec" / "golden" / "tah-entry-v1.hex"
).read_text(encoding="utf-8").strip()

EXPECTED_ENTRY_HEX = "".join(
    [
        "42",
        "00000000000000",
        "0807060504030201",
        "44332211",
        "88776655",
        "03010b0a",
        "hello tah".encode("utf-8").hex(),
        "00" * (SPEC_V1_PAYLOAD_SIZE - len("hello tah")),
    ]
)


class TahEntryLayoutTest(unittest.TestCase):
    def test_packs_the_80_byte_entry_contract(self):
        packed = pack_entry(
            TahEntry(
                tag=0x42,
                offset=0x0102030405060708,
                length=0x11223344,
                meta=0x55667788,
                spec=TahSpecV1(kind=3, version=1, flags=0x0A0B, payload="hello tah"),
            )
        )

        self.assertEqual(len(packed), ENTRY_SIZE)
        self.assertEqual(packed.hex(), GOLDEN_ENTRY_HEX)
        self.assertEqual(GOLDEN_ENTRY_HEX, EXPECTED_ENTRY_HEX)

    def test_round_trips_entry_fields(self):
        decoded = unpack_entry(bytes.fromhex(GOLDEN_ENTRY_HEX))

        self.assertEqual(decoded.tag, 0x42)
        self.assertEqual(decoded.pad, b"\0" * 7)
        self.assertEqual(decoded.offset, 0x0102030405060708)
        self.assertEqual(decoded.length, 0x11223344)
        self.assertEqual(decoded.meta, 0x55667788)
        self.assertEqual(decoded.spec.kind, 3)
        self.assertEqual(decoded.spec.version, 1)
        self.assertEqual(decoded.spec.flags, 0x0A0B)
        self.assertEqual(decoded.spec.payload[:9], b"hello tah")
        self.assertEqual(decoded.raw_spec, pack_spec_v1(decoded.spec))

    def test_rejects_undersized_raw_spec_bytes(self):
        with self.assertRaisesRegex(ValueError, "exactly 56 bytes"):
            unpack_spec_v1(b"\0" * 55)


if __name__ == "__main__":
    unittest.main()
