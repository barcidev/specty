# Reglas de Tecnología: Go

- Respeta el formato canónico oficial con `gofmt` y `goimports`.
- Maneja los errores de forma explícita e inmediata (`if err != nil { return ... }`). Nunca descartes errores en silencio.
- Aplica principios de interfaces pequeñas y compuestas (Single-method interfaces).
- Organiza los paquetes siguiendo la convención estándar (`cmd/`, `pkg/`, `internal/`).
- Evita el uso innecesario de goroutines y sincroniza adecuadamente con `sync` o canales.
