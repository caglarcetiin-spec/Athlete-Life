#!/bin/zsh
# Local distribution launcher. No installation or network configuration changes.
cd "${0:A:h}" || exit 1
typeset -a candidates
candidates=(
  "$PWD/runtime/python/bin/python3"
  "$PWD/.venv-modern/bin/python"
  "$PWD/.venv/bin/python"
  /opt/homebrew/bin/python3
  /usr/local/bin/python3
  /Library/Frameworks/Python.framework/Versions/Current/bin/python3
  "${commands[python3]}"
  "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3.12"
)
for candidate in "${candidates[@]}"; do
  [[ -x "$candidate" ]] || continue
  if "$candidate" -B -E -s -c 'import sys,hashlib,sqlite3; assert sys.version_info >= (3,10); assert hasattr(hashlib,"scrypt")' >/dev/null 2>&1; then
    exec "$candidate" -B -E -s start_local.py "$@"
  fi
done
echo "Python 3.10 veya üzeri gerekli. python.org üzerinden macOS sürümünü kurup yeniden aç."
echo "Ayrıntılar: BASLA.md"
[[ -t 0 ]] && read '?Kapatmak için Enter: '
exit 1
