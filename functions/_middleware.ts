/**
 * Cloudflare Pages middleware for Brotli 11 static asset negotiation.
 *
 * @remarks
 * Serves pre-compressed `.br` sidecars produced during `yarn build` when the
 * client sends `Accept-Encoding: br`. Non-GET/HEAD and `/api/*` requests pass
 * through to downstream handlers unchanged.
 */

/// <reference types="@cloudflare/workers-types" />

import { tryServeBrotliAsset } from "../server/serveBrotliStatic";

interface Env {
  ASSETS: Fetcher;
}

/** Pages middleware entry for all static and function routes. */
export const onRequest: PagesFunction<Env> = async (context) => {
  const brotliResponse = await tryServeBrotliAsset(
    context.request,
    context.env.ASSETS,
  );

  if (brotliResponse) {
    return brotliResponse;
  }

  return context.next();
};
