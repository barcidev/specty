# Technology Rules: Rust

- Format strictly with `cargo fmt` and treat all linter warnings as errors with `cargo clippy -- -D warnings`.
- Avoid `unsafe` blocks unless explicitly justified for critical performance or FFI and approved by maintainers.
- Use idiomatic error propagation via `Result<T, E>` and `?`. Do not use `unwrap()` in production paths.
- Leverage ownership, borrowing, and RAII to guarantee memory safety and race-free concurrency.
- Provide comprehensive doc comments for all public items (`///` and `//!`).
