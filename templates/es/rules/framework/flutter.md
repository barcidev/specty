# Reglas de Framework: Flutter

- Separa UI de la lógica de estado (usa BLoC, Riverpod o Provider).
- Respeta Clean Architecture: capas `presentation`, `domain` y `data`.
- Usa `const` en widgets para optimizar reconstrucciones de árbol.
- Maneja temas y tokens de diseño sin hardcodear colores o dimensiones.
