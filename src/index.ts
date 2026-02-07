// @ts-ignore
import mod from "../wasm/main.wasm";
import "../wasm_exec.js";

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_NAMESPACE_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

export default {
  async fetch(_: any, env: Env, __: any) {
    // @ts-ignore
    const go = new globalThis.Go({
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_NAMESPACE_ID: env.CLOUDFLARE_NAMESPACE_ID,
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    });
    const instance = await WebAssembly.instantiate(mod, go.importObject);
    const retval = await go.run(instance);
    return new Response(`Success: ${retval}`);
  },
};
