import unittest
from unittest.mock import patch
import launch
launch.STORE = type("Store", (), {"backend": "sqlite"})()


@patch("launch.init_db")
class LaunchTests(unittest.TestCase):
    @patch("launch.webbrowser.open")
    @patch("launch.ThreadingHTTPServer", side_effect=OSError("busy"))
    def test_busy_port_never_opens_stale_release(self, server, browser, init_db):
        self.assertEqual(launch.main(), 1)
        browser.assert_not_called()

    @patch("launch.webbrowser.open")
    @patch("launch.ThreadingHTTPServer")
    def test_opens_only_after_binding_same_origin(self, server, browser, init_db):
        self.assertEqual(launch.main(), 0)
        self.assertEqual(server.call_args.args[0], (launch.HOST, launch.PORT))
        browser.assert_called_once_with(f"http://{launch.HOST}:{launch.PORT}/index.html?v={launch.APP_VERSION}")


if __name__ == "__main__":
    unittest.main()
