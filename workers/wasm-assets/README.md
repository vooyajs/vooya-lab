# Vooya Lab WASM asset gateway

This Worker serves large browser WASM files from a private R2 bucket. Pages
keeps the application shell and small artifacts; this gateway owns files that
exceed the Pages per-file limit.

The default `ASSETS_ENABLED=false` is an intentional kill switch. Set it to
`true` in the Worker variables only after the bucket and object are verified.
The Worker also limits each client IP and only serves keys listed in
`src/index.ts`.

## First-time setup

Enable R2 in the Cloudflare dashboard, create the bucket, and upload Rspack:

```sh
pnpm exec wrangler r2 bucket create vooya-lab-assets
pnpm exec wrangler r2 object put vooya-lab-assets/wasm/rspack.wasm \
  --file apps/web/node_modules/@rspack/browser/dist/rspack.wasm32-wasi.wasm \
  --content-type application/wasm \
  --cache-control 'public, max-age=31536000, immutable'
```

Deploy with:

```sh
pnpm run wasm-assets:deploy
```

The config intentionally deploys with the gateway disabled. After checking the
object, enable it for one deployment with:

```sh
pnpm exec wrangler deploy --config workers/wasm-assets/wrangler.jsonc --var ASSETS_ENABLED:true
```

Use `--var ASSETS_ENABLED:false` as the manual kill switch. The variable is
also editable in the Worker dashboard.

Keep the bucket private and expose it only through this Worker.
