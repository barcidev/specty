# Framework Rules: Flutter

- For new projects, scaffold with the official CLI: `flutter create <name>`. Never create base boilerplate file-by-file manually.
- Decouple UI rendering from state management (using BLoC, Riverpod, or Provider).
- Follow Clean Architecture: `presentation`, `domain`, and `data` layers.
- Apply `const` widget constructors to optimize render tree rebuilds.
- Rely on theme tokens instead of hardcoded colors or dimensions.
- Respect the 300-line file limit (decompose large widgets into smaller subwidgets), prefer constants, and apply SOLID principles.
