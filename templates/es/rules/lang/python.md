# Reglas de Tecnología: Python

- Usa tipado estático con `type hints` y validación con `mypy` o `pyright`.
- Respeta el estándar PEP 8 y utiliza `ruff` o `black` + `flake8` para formateo y linting.
- Utiliza entornos virtuales aislados (`venv`, `poetry` o `uv`).
- Prefiere funciones puras, inmutabilidad de datos con dataclasses/pydantic y manejo explícito de excepciones.
- Mantén dependencias fijadas en `requirements.txt`, `pyproject.toml` o `Pipfile`.
