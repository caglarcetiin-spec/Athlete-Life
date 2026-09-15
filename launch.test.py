import unittest
from unittest.mock import patch
import launch


class LaunchTests(unittest.TestCase):
    @patch("launch.webbrowser.open")
    @patch("launch.ThreadingHTTPServer", side_effect=OSError("busy"))
    def test_busy_port_never_opens_stale_release(self, server, browser):
        self.assertEqual(launch.main(), 1)
        browser.assert_not_called()

    @patch("launch.webbrowser.open")
    @patch("launch.ThreadingHTTPServer")
    def test_opens_only_after_binding_same_origin(self, server, browser):
        self.assertEqual(launch.main(), 0)
        self.assertEqual(server.call_args.args[0], ("127.0.0.1", 8765))
        browser.assert_called_once_with("http://127.0.0.1:8765/index.html?v=10.0.0")


if __name__ == "__main__":
    unittest.main()
