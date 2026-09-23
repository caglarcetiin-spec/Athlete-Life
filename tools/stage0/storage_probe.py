"""Synthetic reproduction of legacy overwrite versus current account CAS.

PASS here means the observation was reproduced, not that the product is safe.
No .env loading, no real MongoDB, no HTTP and no persistent user directory.
"""
import copy
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
import sqlite_store
from account_states import SQLiteAccountStates, MongoAccountStates, Conflict


def probe(store):
    initial = {'trainingLogs': {'2026-09-10': [{'id': 'set-a', 'sets': [5]}]}, 'scheduleByDate': {}, 'meta': {}}
    first = store.commit_state('synthetic-a', initial, 'baseline', 0)
    stale = copy.deepcopy(first['data'])
    new = copy.deepcopy(first['data'])
    new['trainingLogs']['2026-09-10'].append({'id': 'set-b', 'sets': [6]})
    accepted = store.commit_state('synthetic-a', new, 'client-A-set', first['revision'])
    stale['scheduleByDate']['2026-09-15'] = {'status': 'work', 'shift': 'evening'}
    conflict = False
    try:
        store.commit_state('synthetic-a', stale, 'client-B-shift', first['revision'])
    except Conflict:
        conflict = True
    latest = store.read_state('synthetic-a')
    assert conflict and len(latest['data']['trainingLogs']['2026-09-10']) == 2
    assert '2026-09-15' not in latest['data']['scheduleByDate']
    assert store.read_state('synthetic-b') is None
    retry_conflict = False
    try:
        store.commit_state('synthetic-a', new, 'lost-ACK-retry', first['revision'])
    except Conflict:
        retry_conflict = True
    assert retry_conflict
    return {'stale_write_rejected': conflict, 'latest_set_ids': ['set-a', 'set-b'],
            'other_client_shift_merged': False, 'other_owner_isolated': True,
            'lost_ack_retry_returns_prior_result': False, 'lost_ack_retry_conflicts': retry_conflict,
            'committed_revision': accepted['revision']}


def main():
    with tempfile.TemporaryDirectory(prefix='alos-stage0-stores-') as temp:
        sqlite_store.DB_PATH = Path(temp) / 'legacy.sqlite3'
        sqlite_store.init_db()
        first = sqlite_store.commit_state({'meta': {}, 'trainingLogs': {'2026-09-10': [{'id': 'set-a', 'sets': [5]}]}}, 'baseline')
        stale = copy.deepcopy(first['data'])
        newer = copy.deepcopy(first['data'])
        newer['trainingLogs']['2026-09-10'].append({'id': 'set-b', 'sets': [6]})
        second = sqlite_store.commit_state(newer, 'new-set')
        stale['week'] = {'1': {'shift': 'evening'}}
        third = sqlite_store.commit_state(stale, 'stale-shift')
        assert len(sqlite_store.read_state()['data']['trainingLogs']['2026-09-10']) == 1
        assert len(sqlite_store.revision_data(second['revision'])['trainingLogs']['2026-09-10']) == 2
        result = {'fixture': 'synthetic', 'legacy': {'silent_overwrite_reproduced': True,
                  'revisions': [first['revision'], second['revision'], third['revision']],
                  'set_b_in_live_state': False, 'set_b_in_old_revision': True},
                  'account_sqlite': probe(SQLiteAccountStates(Path(temp) / 'account.sqlite3'))}
        import mongomock
        with patch('pymongo.MongoClient', return_value=mongomock.MongoClient()):
            result['account_mongodb_mock'] = probe(MongoAccountStates('mongodb://unused', 'synthetic'))
        result['limitations'] = ['MongoDB adapter exercised with mongomock; Atlas durability/concurrency NOT RUN',
                                  'No process-kill or browser e2e in this probe; see separate evidence']
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
