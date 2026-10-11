# Framework Rules: FastAPI

- For new projects, initialize the project with `uv init` or `poetry new <name>`. Never create base boilerplate file-by-file manually.
- Declare strict request and response schemas using Pydantic models (`BaseModel`).
- Leverage FastAPI dependency injection (`Depends`) for database sessions, auth, and shared services.
- Group route handlers into cohesive modular routers (`APIRouter`) by feature domain.
- Return semantic HTTP status codes and handle domain errors using `HTTPException` or custom handlers.
- Keep interactive OpenAPI/Swagger schemas accurate with descriptive docstrings, tags, and summary fields.
- Respect the 300-line file limit (decompose into routers, schemas, and services), prefer constants and immutability, and apply SOLID principles.
