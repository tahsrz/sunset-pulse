import struct

# CityHash64 implementation in Pure Python
# Based on Google's CityHash v1.1.1
# RIGOROUSLY MASKED FOR 64-BIT PARITY

K0 = 0xc3a5c85c97cb3127
K1 = 0xb492b66fbe98f273
K2 = 0x9ae16a3b2f90404f
K3 = 0xc949d7c7509e6557
KMUL = 0x9ddfea08eb382d69
MASK64 = 0xFFFFFFFFFFFFFFFF

def _rotate(val, shift):
    return ((val >> shift) | (val << (64 - shift))) & MASK64

def _shift_mix(val):
    return (val ^ (val >> 47)) & MASK64

def _hash_len_16(u, v):
    a = ((u ^ v) * KMUL) & MASK64
    a ^= (a >> 47)
    b = ((v ^ a) * KMUL) & MASK64
    b ^= (b >> 47)
    b = (b * KMUL) & MASK64
    return b

def _fetch64(data, offset):
    return struct.unpack_from('<Q', data, offset)[0]

def _fetch32(data, offset):
    return struct.unpack_from('<I', data, offset)[0]

def _hash_len_0_to_16(data, length):
    if length > 8:
        a = _fetch64(data, 0)
        b = _fetch64(data, length - 8)
        return _hash_len_16(a, _rotate((b + length) & MASK64, length)) ^ b
    if length >= 4:
        a = _fetch32(data, 0)
        return _hash_len_16((length + (a << 3)) & MASK64, _fetch32(data, length - 4))
    if length > 0:
        a = data[0]
        b = data[length >> 1]
        c = data[length - 1]
        y = (a + (b << 8)) & 0xFFFFFFFF
        z = (length + (c << 2)) & 0xFFFFFFFF
        return (_shift_mix((y * K2 ^ z * K0) & MASK64) * K2) & MASK64
    return K0

def _hash_len_17_to_32(data, length):
    a = _fetch64(data, 0)
    b = _fetch64(data, 8)
    c = _fetch64(data, length - 8)
    d = _fetch64(data, length - 16)
    return _hash_len_16((_rotate((a - b) & MASK64, 43) + _rotate(c, 30) + d) & MASK64,
                        (a + _rotate((b ^ K2) & MASK64, 18) + c) & MASK64)

def _weak_hash_len_32_with_seeds(w, x, y, z, a, b):
    a = (a + w) & MASK64
    b = _rotate((b + a + z) & MASK64, 21)
    c = a
    a = (a + x) & MASK64
    a = (a + y) & MASK64
    b = (b + _rotate(a, 44)) & MASK64
    return (a + z) & MASK64, (b + c) & MASK64

def _city_hash64(data: bytes) -> int:
    length = len(data)
    if length <= 32:
        if length <= 16:
            return _hash_len_0_to_16(data, length)
        else:
            return _hash_len_17_to_32(data, length)
    elif length <= 64:
        # Check if length is sufficient for the offsets used
        # CityHash reference handles 32-64 with specific logic
        if length >= 40:
            x = _fetch64(data, length - 40)
            y = (_fetch64(data, length - 16) ^ _fetch64(data, length - 24)) & MASK64
            z = _fetch64(data, length - 8)
            v0 = (_rotate(y, 33) * K1) & MASK64
            v1 = (_rotate((y + x) & MASK64, 33) * K1) & MASK64
            w0 = ((_rotate((z + v0) & MASK64, 35) * K1) + v1) & MASK64
            w1 = (_rotate((x + y) & MASK64, 33) * K1) & MASK64
            return _hash_len_16((v0 + v1) & MASK64, (w0 + w1) & MASK64)
        else:
            return _hash_len_17_to_32(data, length)

    # For length > 64
    x = _fetch64(data, 0)
    y = (_fetch64(data, length - 16) ^ _fetch64(data, length - 32)) & MASK64
    z = _fetch64(data, length - 8)
    v0 = (_rotate(y, 33) * K1) & MASK64
    v1 = (_rotate((y + x) & MASK64, 33) * K1) & MASK64
    w0 = ((_rotate((z + v0) & MASK64, 35) * K1) + v1) & MASK64
    w1 = (_rotate((x + y) & MASK64, 33) * K1) & MASK64
    x = (_rotate((x + y) & MASK64, 42) * K1) & MASK64
    v = (v0, v1)
    w = (w0, w1)

    offset = 0
    while length - offset > 64:
        x = (_rotate((x + y + v[0] + _fetch64(data, offset + 8)) & MASK64, 37) * K1) & MASK64
        y = (_rotate((y + v[1] + _fetch64(data, offset + 48)) & MASK64, 42) * K1) & MASK64
        x ^= w[1]
        y = (y + v[0] + _fetch64(data, offset + 40)) & MASK64
        z = (_rotate((z + w[0]) & MASK64, 33) * K1) & MASK64
        v = _weak_hash_len_32_with_seeds(_fetch64(data, offset), _fetch64(data, offset + 16), _fetch64(data, offset + 24), _fetch64(data, offset + 32), v[0], v[1])
        w = _weak_hash_len_32_with_seeds(_fetch64(data, offset + 32), _fetch64(data, offset + 40), _fetch64(data, offset + 48), _fetch64(data, offset + 56), w[0], w[1])
        z, x = x, z
        offset += 64

    return _hash_len_16((_hash_len_16(v[0], v[1]) + (_shift_mix(y) * K1) + z) & MASK64,
                        (_hash_len_16(w[0], w[1]) + x) & MASK64)

def city_hash64(data: bytes, seed: int = None) -> int:
    """Public API for CityHash64."""
    if seed is None:
        return _city_hash64(data)
    else:
        # CityHash64WithSeed implementation
        return _hash_len_16((_city_hash64(data) - K2) & MASK64, seed)

def normalize(text: str) -> bytes:
    """Normalizes string according to TAH standards."""
    return text.lower().strip().encode('utf-8')

def get_tah_indices(text: str, m: int, k: int) -> list[int]:
    """Generates k indices for a string using TAH double hashing."""
    x = normalize(text)
    h1 = city_hash64(x)
    h2 = city_hash64(x + b"TAH_SALT")

    indices = []
    for i in range(k):
        indices.append(((h1 + i * h2) & MASK64) % m)
    return indices

if __name__ == "__main__":
    # Test cases
    test_str = "    Texas Real Estate    "
    indices = get_tah_indices(test_str, 10000, 3)
    print(f"Indices for '{test_str}': {indices}")