"""Prepare static/ so the app runs without server.py (e.g. on GitHub Pages).

Writes static/content.json and copies runner.py to static/runner.py (the browser runs it with Pyodide).
Run:  python build_static.py
The deploy workflow runs this after validate.py. Both outputs are gitignored.
"""
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
sys.path.insert(0, ROOT)
from content import load_all  # noqa: E402


def main():
    data = load_all()
    out = os.path.join(STATIC, "content.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    shutil.copyfile(os.path.join(ROOT, "runner.py"), os.path.join(STATIC, "runner.py"))
    print(f"Wrote static/content.json ({len(data['problems'])} problems, {len(data['patterns'])} patterns, "
          f"{os.path.getsize(out) // 1024} KB) and static/runner.py")


if __name__ == "__main__":
    main()
