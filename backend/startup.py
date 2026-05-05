"""
One-shot startup helper: loads .env then starts the dev server.
Usage: python startup.py
"""
import subprocess, sys, pathlib

env_file = pathlib.Path(__file__).parent / ".env"
if not env_file.exists():
    example = pathlib.Path(__file__).parent / ".env.example"
    if example.exists():
        env_file.write_text(example.read_text())
        print("[startup] Created .env from .env.example — edit it to add your API key.")

subprocess.run(
    [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
    cwd=pathlib.Path(__file__).parent,
)
