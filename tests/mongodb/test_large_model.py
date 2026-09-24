"""Synthetic model uploads, never personal GLB files or live MongoDB."""
from uuid import uuid4

from conftest import login
from test_body_model import synthetic_glb


def test_binary_model_ack_retry_owner_and_metadata(app, client, monkeypatch):
    data = synthetic_glb()
    params = {'operation_id': str(uuid4()), 'entity_id': str(uuid4()), 'name': 'Sentetik.glb'}
    response = client.post('/api/v2/body-model/upload', params=params, content=data)
    assert response.status_code == 200, response.text
    assert client.post('/api/v2/body-model/upload', params=params, content=data).json() == response.json()
    assert client.get('/api/v2/body-model/content').content == data
    assert client.get('/api/v2/body-model').json()['bytes'] == len(data)
    other = login(app, 'arda', 'test-password-456')
    assert other.get('/api/v2/media/' + params['entity_id']).status_code == 404
    bad = client.post('/api/v2/body-model/upload', params={**params, 'operation_id': str(uuid4()), 'entity_id': str(uuid4())}, content=b'not glb')
    assert bad.status_code == 422
    assert client.post('/api/v2/body-model/upload', params=params, content=data,
                       headers={'Content-Length': str(97 * 1024 * 1024)}).status_code == 413
    assert client.post('/api/v2/body-model/upload', params=params, content=data,
                       headers={'X-CSRF-Token': 'invalid'}).status_code == 403
    assert len(client.get('/api/v2/bootstrap').json()['medias']) == 1
    from alos import body_model
    monkeypatch.setattr(body_model, 'MAX_MODEL_BYTES', len(data) - 1)
    assert client.post('/api/v2/body-model/upload', params=params, content=iter([data]),
                       headers={'Content-Length':'0'}).status_code == 413


def test_streamed_bson_matches_driver_and_json_hashes():
    import hashlib
    import json

    from alos.bson_stream import document_chunks
    from alos.service import digest_of
    from bson import encode
    for text in ['x' * (1024 * 1024 + 7), 'İı😊漢' * 300000]:
        document = {'_id': 'synthetic', 'binary': bytes(1024 * 1024 + 3), 'text': text,
                    'small': {'n': 4, 'null': None}, 'boolean': True}
        assert b''.join(document_chunks(document)) == encode(document)
        value = {'a': text, 'number': 1.234567, 'list': [False, None, {'n': -3}]}
        old = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()).hexdigest()
        assert digest_of(value) == old


def test_streaming_backup_compatibility():
    import base64
    import hashlib
    import json
    from io import BytesIO

    import pytest
    import rfc8785
    from alos.backups import parse_bytes, parse_stream, rfc_checksum
    from alos.errors import DomainError
    from alos.large_json import Base64Content, json_bytes
    from alos.service import digest_of

    binary = b'\xff\x00\x11' * 32769
    body = {'\U0001f600': 'İı漢\\"\n' * 20000, '\ue000': [1e-7, 1e21, -0.0, True, None],
            'content': base64.b64encode(binary).decode()}
    streaming = {**body, 'content': Base64Content(binary)}
    assert rfc_checksum(streaming) == hashlib.sha256(rfc8785.dumps(body)).hexdigest()
    for ascii_only in (False, True):
        encoded = b''.join(json_bytes(streaming, ensure_ascii=ascii_only))
        assert parse_stream(BytesIO(encoded)) == parse_bytes(encoded) == body
    body['large_integer'] = 2**64 + 1
    streaming['large_integer'] = body['large_integer']
    expected = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    assert digest_of(streaming) == expected
    for invalid in [b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":"\xff"}', b'[]', b'{"a":"\\ud800"}']:
        with pytest.raises(DomainError):
            parse_stream(BytesIO(invalid))
    assert parse_stream(BytesIO(b'\xef\xbb\xbf{"a": "ok"}')) == {'a':'ok'}
