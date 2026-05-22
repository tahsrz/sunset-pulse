from dataclasses import dataclass
import struct
from typing import Union

ENTRY_SIZE = 80
ENTRY_HEADER_SIZE = 24
ENTRY_SPEC_SIZE = 56
ENTRY_PAD_SIZE = 7
SPEC_V1_PAYLOAD_SIZE = 52

_ENTRY_STRUCT = struct.Struct("<B7sQII56s")
_SPEC_V1_STRUCT = struct.Struct("<BBH52s")


BytesLike = Union[bytes, bytearray, memoryview, str]


@dataclass(frozen=True)
class TahSpecV1:
    kind: int
    version: int
    flags: int
    payload: BytesLike = b""


@dataclass(frozen=True)
class TahEntry:
    tag: int
    offset: int
    length: int
    meta: int
    spec: Union[TahSpecV1, BytesLike]
    pad: BytesLike = b""


@dataclass(frozen=True)
class DecodedTahEntry:
    tag: int
    pad: bytes
    offset: int
    length: int
    meta: int
    spec: TahSpecV1
    raw_spec: bytes


def pack_spec_v1(spec: TahSpecV1) -> bytes:
    _assert_uint("spec.kind", spec.kind, 0xFF)
    _assert_uint("spec.version", spec.version, 0xFF)
    _assert_uint("spec.flags", spec.flags, 0xFFFF)
    return _SPEC_V1_STRUCT.pack(
        spec.kind,
        spec.version,
        spec.flags,
        _fixed_bytes(spec.payload, SPEC_V1_PAYLOAD_SIZE, "spec.payload"),
    )


def unpack_spec_v1(data: BytesLike) -> TahSpecV1:
    raw = _exact_bytes(data, ENTRY_SPEC_SIZE, "spec")
    kind, version, flags, payload = _SPEC_V1_STRUCT.unpack(raw)
    return TahSpecV1(kind=kind, version=version, flags=flags, payload=payload)


def pack_entry(entry: TahEntry) -> bytes:
    _assert_uint("entry.tag", entry.tag, 0xFF)
    _assert_uint("entry.offset", entry.offset, 0xFFFFFFFFFFFFFFFF)
    _assert_uint("entry.length", entry.length, 0xFFFFFFFF)
    _assert_uint("entry.meta", entry.meta, 0xFFFFFFFF)

    spec = (
        pack_spec_v1(entry.spec)
        if isinstance(entry.spec, TahSpecV1)
        else _exact_bytes(entry.spec, ENTRY_SPEC_SIZE, "entry.spec")
    )

    return _ENTRY_STRUCT.pack(
        entry.tag,
        _fixed_bytes(entry.pad, ENTRY_PAD_SIZE, "entry.pad"),
        entry.offset,
        entry.length,
        entry.meta,
        spec,
    )


def unpack_entry(data: BytesLike) -> DecodedTahEntry:
    raw = _exact_bytes(data, ENTRY_SIZE, "entry")
    tag, pad, offset, length, meta, raw_spec = _ENTRY_STRUCT.unpack(raw)
    return DecodedTahEntry(
        tag=tag,
        pad=pad,
        offset=offset,
        length=length,
        meta=meta,
        spec=unpack_spec_v1(raw_spec),
        raw_spec=raw_spec,
    )


def _assert_uint(name: str, value: int, maximum: int) -> None:
    if not isinstance(value, int) or value < 0 or value > maximum:
        raise ValueError(f"{name} must be an unsigned integer <= {maximum}")


def _fixed_bytes(value: BytesLike, size: int, label: str) -> bytes:
    raw = _coerce_bytes(value)
    if len(raw) > size:
        raise ValueError(f"{label} must be {size} bytes or less")
    return raw.ljust(size, b"\0")


def _exact_bytes(value: BytesLike, size: int, label: str) -> bytes:
    raw = _coerce_bytes(value)
    if len(raw) != size:
        raise ValueError(f"{label} must be exactly {size} bytes")
    return raw


def _coerce_bytes(value: BytesLike) -> bytes:
    if isinstance(value, str):
        return value.encode("utf-8")
    return bytes(value)
