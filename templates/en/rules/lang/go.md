# Technology Rules: Go

- Always format code with official `gofmt` and `goimports`.
- Handle errors explicitly and immediately (`if err != nil { return ... }`). Never silently discard errors.
- Keep interfaces small, cohesive, and consumer-defined.
- Structure packages according to standard layout conventions (`cmd/`, `pkg/`, `internal/`).
- Avoid unnecessary goroutine spawning; coordinate concurrency with `sync` primitives or channels.
