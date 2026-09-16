"""Run the same account HTTP contracts against the cloud repositories."""
import importlib.util
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import mongomock
from mongo_accounts import MongoAccounts
from account_states import MongoAccountStates
from account_server import make_server

spec = importlib.util.spec_from_file_location('account_contracts', Path(__file__).with_name('accounts.test.py'))
contracts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contracts)


class CloudHTTPTests(contracts.HTTPTests):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        client = mongomock.MongoClient()
        cls.accounts = MongoAccounts(client.test)
        with patch('pymongo.MongoClient', return_value=client):
            cls.states = MongoAccountStates('mongodb://synthetic', 'test')
        cls.server = make_server(cls.accounts, cls.states, port=0)
        cls.server.photos.transaction = lambda callback: callback(None)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()


if __name__ == '__main__':
    unittest.main()
