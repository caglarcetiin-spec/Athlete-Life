"""Bounded JSON output for private binary attachments; ordinary JSON on the wire."""
import base64
import json
from dataclasses import dataclass


@dataclass(frozen=True)
class Base64Content:
    data: bytes

    def chunks(self):
        for offset in range(0, len(self.data), 3 * 16384):
            yield base64.b64encode(memoryview(self.data)[offset:offset + 3 * 16384])


def json_bytes(value, sort_keys=False, ensure_ascii=False):
    if isinstance(value, Base64Content):
        yield b'"'
        yield from value.chunks()
        yield b'"'
    elif isinstance(value, str):
        yield b'"'
        for offset in range(0, len(value), 16384):
            yield json.dumps(value[offset:offset + 16384], ensure_ascii=ensure_ascii)[1:-1].encode('utf-8')
        yield b'"'
    elif isinstance(value, dict):
        yield b'{'
        for index, (key, item) in enumerate(sorted(value.items()) if sort_keys else value.items()):
            if index:
                yield b','
            yield from json_bytes(key, sort_keys=sort_keys, ensure_ascii=ensure_ascii)
            yield b':'
            yield from json_bytes(item, sort_keys=sort_keys, ensure_ascii=ensure_ascii)
        yield b'}'
    elif isinstance(value, (list, tuple)):
        yield b'['
        for index, item in enumerate(value):
            if index:
                yield b','
            yield from json_bytes(item, sort_keys=sort_keys, ensure_ascii=ensure_ascii)
        yield b']'
    else:
        yield json.dumps(value, allow_nan=False).encode('utf-8')
