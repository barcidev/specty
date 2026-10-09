# Framework Rules: Flutter

- Decouple UI rendering from state management (using BLoC, Riverpod, or Provider).
- Follow Clean Architecture: `presentation`, `domain`, and `data` layers.
- Apply `const` widget constructors to optimize render tree rebuilds.
- Rely on theme tokens instead of hardcoded colors or dimensions.
