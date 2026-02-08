import type { Request } from "@cloudflare/workers-types";
import log from "loglevel";
// @ts-expect-error: go wasm realted
import mod from "../wasm/main.wasm";
import "../wasm_exec.js";

export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_NAMESPACE_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, __: any): Promise<Response> {
    log.info(`Request Recieved: ${request}`);
    // @ts-expect-error: go wasm realted
    const go = new globalThis.Go({
      CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_NAMESPACE_ID: env.CLOUDFLARE_NAMESPACE_ID,
      CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN,
    });
    const url = new URL(request.url);
    const instance = await WebAssembly.instantiate(mod, go.importObject);
    go.run(instance);
    if (request.method === "POST") {
      console.log(request.headers);
      const authHeader = request.headers.get("authorization");
      if (!authHeader || authHeader !== env.AUTH_SECRET) {
        log.info(
          `Unavailable Auth Header / Auth Header not Matching: ${authHeader}`,
        );
        console.log(authHeader);
        return new Response("Unauthorized", {
          status: 401,
        });
      }
      const reqBody = (await request.json()) as { Url?: string };
      const urlToShorten = reqBody.Url;
      if (!urlToShorten) {
        return new Response("Incomplete Request, Include the `Url` Header", {
          status: 400,
        });
      }
      log.info(`Accessed Url to Shorten from Request Body: ${urlToShorten}`);
      try {
        // @ts-expect-error: go wasm realted
        const checkSum = await globalThis.createShortURL(urlToShorten);
        log.info(`Created Check Sum for Url: ${urlToShorten}=${checkSum}`);
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
        log.error(error);
        return new Response(error as string, { status: 500 });
      }
    }
    if (url.pathname.split("/").length <= 1) {
      try {
        // @ts-expect-error: go wasm realted
        const redirectUrl = await globalThis.getRedirectURL(
          url.pathname.slice(1),
        );
        log.info(
          `Access Redirect Url for Check Sum: ${url.pathname.slice(1)}={redirectUrl}`,
        );
        return Response.redirect(redirectUrl, 301);
      } catch (error) {
        log.error(error);
        return new Response(error as string, { status: 500 });
      }
    }
    return new Response("url-shortner-go-wasm", { status: 200 });
  },
};
