@echo off
cd /d "%~dp0"
if exist .venv\Scripts\python.exe (
  .venv\Scripts\python.exe start_local.py %*
) else (
  python start_local.py %*
)
if errorlevel 1 pause
