# Framework Rules: FastAPI

- Declare strict request and response schemas using Pydantic models (`BaseModel`).
- Leverage FastAPI dependency injection (`Depends`) for database sessions, auth, and shared services.
- Group route handlers into cohesive modular routers (`APIRouter`) by feature domain.
- Return semantic HTTP status codes and handle domain errors using `HTTPException` or custom handlers.
- Keep interactive OpenAPI/Swagger schemas accurate with descriptive docstrings, tags, and summary fields.
