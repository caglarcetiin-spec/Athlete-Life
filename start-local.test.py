import tempfile
import unittest
from pathlib import Path
from start_local import launch_defaults


class LaunchDefaultsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.home = self.root / 'home'

    def options(self, argv=(), environment=None):
        args = launch_defaults(self.root, list(argv), environment or {}, self.home)
        return dict(zip(args[::2], args[1::2]))

    def private_seed(self):
        path = self.root / 'private-data' / 'first-profile.alosbackup'
        path.parent.mkdir()
        path.write_text('{}')

    def test_clean_checkout_is_local_without_seed(self):
        options = self.options()
        self.assertEqual(options['--backend'], 'sqlite')
        self.assertEqual(options['--port'], '10002')
        self.assertNotIn('--seed-backup', options)

    def test_private_seed_does_not_override_configured_mongodb(self):
        self.private_seed()
        options = self.options(environment={'STORAGE_BACKEND': 'mongodb'})
        self.assertEqual(options['--backend'], 'mongodb')
        self.assertEqual(options['--port'], '10004')
        self.assertTrue(Path(options['--seed-backup']).is_file())

    def test_cli_backend_overrides_configuration_and_selects_matching_origin(self):
        self.private_seed()
        local = self.options(['--backend', 'sqlite'], {'STORAGE_BACKEND': 'mongodb'})
        remote = self.options(['--backend=mongodb'], {'STORAGE_BACKEND': 'sqlite'})
        self.assertEqual((local['--backend'], local['--port']), ('sqlite', '10003'))
        self.assertEqual((remote['--backend'], remote['--port']), ('mongodb', '10004'))
        self.assertEqual(local['--data-dir'], remote['--data-dir'])


if __name__ == '__main__':
    unittest.main()
