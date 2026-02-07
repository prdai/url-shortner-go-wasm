# url-shortner-go-wasm

A URL shortener written in Go, compiled to WebAssembly, running on Cloudflare Workers. Uses Cloudflare Workers KV for storage and CRC32 for generating short IDs.

## Architecture

```
Request → Cloudflare Worker (TypeScript) → Go WASM Module → Cloudflare KV
```

The TypeScript entrypoint handles routing and auth. The Go module, compiled to WASM via `GOOS=js GOARCH=wasm`, exposes two functions on `globalThis` through `syscall/js`:

- `createShortUrl(url)` — CRC32 hashes the URL, writes the mapping to KV, returns the checksum
- `getRedirectUrl(id)` — looks up the original URL from KV by checksum

Both return JavaScript Promises wrapping async Go routines. The Go WASM runtime is initialized via `wasm_exec.js` with environment variables passed at instantiation.

## API

### POST `/` — Shorten a URL

```bash
curl -X POST https://s.prdai.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: <AUTH_SECRET>" \
  -d '{"Url": "https://www.google.com/"}'
```

```json
{ "redirectUrl": "https://s.prdai.dev/2743104607" }
```

### GET `/:id` — Redirect

Returns a `301` redirect to the original URL.

## Stack

| Component          | Role                         |
| ------------------ | ---------------------------- |
| Go 1.25+           | Core logic, compiled to WASM |
| `syscall/js`       | Go ↔ JS bridge              |
| `wasm_exec.js`     | Go WASM runtime              |
| Cloudflare Workers | Runtime                      |
| Cloudflare KV      | Key-value storage            |
| CRC32              | URL → short ID generation    |
| TypeScript         | Worker entrypoint            |

## Setup

### Prerequisites

- [Go](https://golang.org/) 1.25+
- [Bun](https://bun.sh/)
- [Just](https://github.com/casey/just)
- Cloudflare account with a KV namespace

### Install

```bash
git clone https://github.com/prdai/url-shortner-go-wasm.git
cd url-shortner-go-wasm
bun i
go mod download
```

### Configure

```bash
cp .env.example .env
```

Set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_NAMESPACE_ID`, `CLOUDFLARE_API_TOKEN`, and `AUTH_SECRET`.

### Development

```bash
just dev
```

Compiles Go to `wasm/main.wasm` and starts `wrangler dev`.

### Deploy

```bash
bun run deploy
```

## License

MIT
