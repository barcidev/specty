# Technology Rules: Python

- Enforce static typing with `type hints` and validate with `mypy` or `pyright`.
- Follow PEP 8 guidelines and format/lint using `ruff` or `black` + `flake8`.
- Always use isolated virtual environments (`venv`, `poetry`, or `uv`).
- Favor pure functions, immutability using dataclasses/pydantic, and explicit exception handling.
- Pin production dependencies in `requirements.txt`, `pyproject.toml`, or `Pipfile`.
