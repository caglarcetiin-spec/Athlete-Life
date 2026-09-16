import unittest
from unittest.mock import patch

from account_server import make_server
from start_render import render_arguments


class RenderStartTests(unittest.TestCase):
    def environment(self):
        return {'RENDER_EXTERNAL_URL': 'https://example.onrender.com', 'PORT': '12345',
                'STORAGE_BACKEND': 'mongodb', 'MONGODB_URI': 'mongodb://synthetic',
                'ACCOUNT_STORAGE_BACKEND': 'mongodb'}

    def test_provider_port_and_https_are_used(self):
        args = render_arguments(self.environment())
        options = dict(zip(args[:-1:2], args[1:-1:2]))
        self.assertEqual(options['--host'], '0.0.0.0')
        self.assertEqual(options['--port'], '12345')
        self.assertEqual(options['--public-origin'], 'https://example.onrender.com')
        self.assertEqual(args[-1], '--no-browser')

    def test_missing_persistence_or_insecure_origin_is_rejected(self):
        for field, value in [('RENDER_EXTERNAL_URL', ''), ('RENDER_EXTERNAL_URL', 'http://example.onrender.com'),
                             ('STORAGE_BACKEND', 'sqlite'), ('MONGODB_URI', ''),
                             ('ACCOUNT_STORAGE_BACKEND', 'sqlite'), ('PORT', '0')]:
            with self.subTest(field=field, value=value):
                with self.assertRaises(ValueError): render_arguments({**self.environment(), field: value})

    def test_external_binding_requires_https_before_opening_socket(self):
        with patch('account_server.ThreadingHTTPServer') as factory:
            with self.assertRaises(ValueError): make_server(None, None, bind_host='0.0.0.0')
            factory.assert_not_called()

if __name__ == '__main__':
    unittest.main()
