// @ts-ignore
import mod from "../wasm/main.wasm";
import "../wasm_exec.js";
import { Request } from "@cloudflare/workers-types";

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_NAMESPACE_ID: string;
  CLOUDFLARE_API_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, __: any): Promise<Response> {
    // @ts-ignore
    const go = new globalThis.Go({
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_NAMESPACE_ID: env.CLOUDFLARE_NAMESPACE_ID,
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    });
    const instance = await WebAssembly.instantiate(mod, go.importObject);
    go.run(instance);
    if (request.method == "POST") {
      // @ts-ignore
      const checkSum = globalThis.createShortUrl("https://github.com/prdai");
      console.log(checkSum);
    }
    return new Response(`Success`);
  },
};
