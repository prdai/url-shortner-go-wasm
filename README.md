# url-shortner-go-wasm

a url shortener written in go, compiled to webassembly, running on cloudflare workers. uses cloudflare workers kv for storage and crc32 for generating short ids.

## architecture

```
request → cloudflare worker (typescript) → go wasm module → cloudflare kv
```

the typescript entrypoint handles routing and auth. the go module, compiled to wasm via `goos=js goarch=wasm`, exposes two functions on `globalthis` through `syscall/js`:

- `createshorturl(url)` — crc32 hashes the url, writes the mapping to kv, returns the checksum
- `getredirecturl(id)` — looks up the original url from kv by checksum

both return javascript promises wrapping async go routines. the go wasm runtime is initialized via `wasm_exec.js` with environment variables passed at instantiation.

## api

### post `/` — shorten a url

```bash
curl -X POST https://s.prdai.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: <auth_secret>" \
  -d '{"Url": "https://www.google.com/"}'
```

```json
{ "redirecturl": "https://s.prdai.dev/2743104607" }
```

### get `/:id` — redirect

returns a `301` redirect to the original url.

## stack

| component          | role                                                        |
| ------------------ | ----------------------------------------------------------- |
| go 1.25+           | core logic, compiled to wasm                                |
| `syscall/js`       | go ↔ js bridge                                             |
| `wasm_exec.js`     | go wasm runtime (from go team, customized to pass env vars) |
| cloudflare workers | runtime                                                     |
| cloudflare kv      | key-value storage                                           |
| crc32              | url → short id generation                                   |
| typescript         | worker entrypoint                                           |

## setup

### prerequisites

- [go](https://golang.org/) 1.25+
- [bun](https://bun.sh/)
- [just](https://github.com/casey/just)
- cloudflare account with a kv namespace

### install

```bash
git clone https://github.com/prdai/url-shortner-go-wasm.git
cd url-shortner-go-wasm
bun i
go mod download
```

### configure

```bash
cp .env.example .env
```

set `cloudflare_account_id`, `cloudflare_namespace_id`, `cloudflare_api_token`, and `auth_secret`.

### development

```bash
just dev
```

compiles go to `wasm/main.wasm` and starts `wrangler dev`.

### deploy

```bash
bun run deploy
```

## license

mit
