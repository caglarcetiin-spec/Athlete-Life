"""Stream large scalar BSON fields using the same wire format as bson.encode.

Repository JSON columns are already serialized strings. Metadata and all small
values continue through the driver's encoder; no new persistent format is used.
"""
import struct

from bson import encode

CHUNK = 1024 * 1024


def document_chunks(document):
    entries = []
    total = 5
    for key, value in document.items():
        if isinstance(value, (str, bytes)) and len(value) >= CHUNK:
            name = key.encode('utf-8') + b'\0'
            if isinstance(value, bytes):
                header = b'\x05' + name + struct.pack('<i', len(value)) + b'\0'
                size, suffix = len(value), b''
            else:
                size = len(value) if value.isascii() else sum(len(value[i:i+65536].encode('utf-8')) for i in range(0, len(value), 65536))
                header = b'\x02' + name + struct.pack('<i', size + 1)
                suffix = b'\0'
            entries.append((header, value, suffix))
            total += len(header) + size + len(suffix)
        else:
            element = encode({key: value})[4:-1]
            entries.append((element, None, b''))
            total += len(element)

    def pieces():
        yield struct.pack('<i', total)
        for header, value, suffix in entries:
            yield header
            if isinstance(value, bytes):
                for offset in range(0, len(value), CHUNK):
                    yield memoryview(value)[offset:offset+CHUNK]
            elif isinstance(value, str):
                for offset in range(0, len(value), 65536):
                    yield value[offset:offset+65536].encode('utf-8')
            yield suffix
        yield b'\0'

    buffer = bytearray()
    for piece in pieces():
        view = memoryview(piece)
        while view:
            count = min(CHUNK - len(buffer), len(view))
            buffer.extend(view[:count])
            view = view[count:]
            if len(buffer) == CHUNK:
                yield bytes(buffer)
                buffer.clear()
    if buffer:
        yield bytes(buffer)
