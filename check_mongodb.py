"""Check configured MongoDB with a temporary collection; never print secrets."""
import uuid
from state_repository import load_environment, create_store
from pathlib import Path


def main():
    load_environment()
    store = None
    probe = None
    try:
        store = create_store(Path('unused.sqlite3'))
        if store.backend != 'mongodb':
            print('MongoDB backend is not selected.')
            return 1
        store.init_db()
        state = store.read_state()
        print('MongoDB connection: OK; current revision:', state['revision'] if state else 0)
        probe = store.collection.database['connection_check_' + uuid.uuid4().hex]
        original_collection = store.collection
        store.collection = probe
        store.init_db()
        saved = store.commit_state({'meta': {}, 'connectionCheck': True}, 'connection-check')
        assert store.read_state()['checksum'] == saved['checksum']
        restored = store.commit_state(store.revision_data(saved['revision']), 'restore-check')
        assert restored['revision'] == saved['revision'] + 1
        assert len(store.list_revisions()) == 2
        store.collection = original_collection
        print('Temporary collection save/read/restore: OK')
        return 0
    except Exception as exc:
        print('MongoDB check failed:', type(exc).__name__)
        detail = str(exc).lower()
        if 'certificate_verify_failed' in detail or 'certificate verify failed' in detail:
            print('Diagnosis: TLS certificate verification failed.')
        elif 'authentication failed' in detail:
            print('Diagnosis: authentication rejected.')
        elif 'ssl' in detail or 'tls' in detail:
            print('Diagnosis: TLS handshake failed; check Atlas network access and TLS configuration.')
        elif 'timed out' in detail or 'timeout' in detail:
            print('Diagnosis: server unreachable; check Atlas IP access list and network connectivity.')
        elif 'dns' in detail or 'resolution' in detail:
            print('Diagnosis: DNS lookup failed.')
        return 1
    finally:
        if probe is not None:
            try:
                probe.drop()
            except Exception:
                print('Temporary test collection cleanup failed.')
        if store is not None and hasattr(store, 'client'):
            store.client.close()


if __name__ == '__main__':
    raise SystemExit(main())
