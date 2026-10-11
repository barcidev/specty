# Reglas de Framework: Flutter

- Para proyectos nuevos, genera el proyecto con el CLI oficial: `flutter create <nombre>`. Prohibido crear archivos base uno a uno manualmente.
- Separa UI de la lógica de estado (usa BLoC, Riverpod o Provider).
- Respeta Clean Architecture: capas `presentation`, `domain` y `data`.
- Usa `const` en widgets y constructores para optimizar reconstrucciones de árbol.
- Maneja temas y tokens de diseño sin hardcodear colores o dimensiones.
- Respeta el límite de 300 líneas por archivo (descomponer widgets grandes en subwidgets), constantes y principios SOLID.
