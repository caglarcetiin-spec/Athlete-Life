#!/bin/zsh
set -e
cd "${0:A:h}"
if [[ -x .venv-modern/bin/python ]]; then
  exec .venv-modern/bin/python -B account_server.py
elif [[ -x .venv/bin/python ]]; then
  exec .venv/bin/python -B account_server.py
else
  exec python3 -B account_server.py
fi
