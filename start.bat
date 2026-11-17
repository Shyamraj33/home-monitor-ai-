@echo off
echo Starting AegisHome AI Server...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
