// @ts-ignore
import mod from "../wasm/main.wasm";
import "../wasm_exec.js";
import { Request } from "@cloudflare/workers-types";

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_NAMESPACE_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, __: any): Promise<Response> {
    // @ts-ignore
    const go = new globalThis.Go({
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_NAMESPACE_ID: env.CLOUDFLARE_NAMESPACE_ID,
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    });
    const url = new URL(request.url);
    const instance = await WebAssembly.instantiate(mod, go.importObject);
    go.run(instance);
    if (request.method == "POST") {
      const authHeader = request.headers.get("Authorization");
      console.log(authHeader);
      if (!authHeader || authHeader !== env.AUTH_SECRET) {
        return new Response("Unauthorized", {
          status: 401,
        });
      }
      const reqBody = (await request.json()) as { Url?: string };
      const urlToShorten = reqBody["Url"];
      if (!urlToShorten) {
        return new Response("Incomplete Request, Include the `Url` Header", {
          status: 400,
        });
      }
      try {
        // @ts-ignore
        const checkSum = await globalThis.createShortUrl(urlToShorten);
        const responseBody = JSON.stringify({
          redirectUrl: `${url.origin}/${checkSum}`,
        });
        return new Response(responseBody, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        return new Response(error as string, { status: 500 });
      }
    }
    if (url.pathname.split("/").length <= 1) {
      try {
        // @ts-ignore
        const redirectUrl = await globalThis.getRedirectUrl(
          url.pathname.slice(1),
        );
        return Response.redirect(redirectUrl, 301);
      } catch (error) {
        return new Response(error as string, { status: 500 });
      }
    }
    return new Response("url-shortner-go-wasm", { status: 200 });
  },
};
