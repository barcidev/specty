# Reglas de Tecnología: Rust

- Formatea el código estrictamente con `cargo fmt` y verifica advertencias con `cargo clippy -- -D warnings`.
- Evita el uso de `unsafe` salvo justificación explícita de rendimiento o FFI validada por el revisor.
- Maneja errores de forma idiomática utilizando `Result<T, E>` y el operador `?`. Evita `unwrap()` en código de producción.
- Aprovecha el sistema de ownership y borrowing para garantizar seguridad en concurrencia sin data races.
- Documenta funciones públicas y módulos con comentarios de documentación (`///` y `//!`).
