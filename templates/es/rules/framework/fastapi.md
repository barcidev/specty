# Reglas de Framework: FastAPI

- Declara esquemas de petición y respuesta estrictos utilizando modelos Pydantic (`BaseModel`).
- Usa inyección de dependencias (`Depends`) para base de datos, autenticación y servicios compartidos.
- Organiza endpoints en routers modulares (`APIRouter`) por dominio funcional.
- Define códigos de estado HTTP semánticos y maneja excepciones personalizadas con `HTTPException`.
- Mantén la documentación interactiva OpenAPI/Swagger actualizada mediante descripciones y tags claros.
