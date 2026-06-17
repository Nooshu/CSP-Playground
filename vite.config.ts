import { defineConfig } from "vite";
import { cspLookupPlugin } from "./server/cspLookupPlugin";
import { renderIndexAppHtml } from "./src/ssg/renderIndexApp";
import { renderSiteMetaHtml, siteMetaPageFromFilename } from "./src/siteMeta";
import { renderSiteFooterHtml } from "./src/ui/siteFooter";

export default defineConfig({
  root: ".",
  plugins: [
    cspLookupPlugin(),
    {
      name: "csp-builder-site-meta",
      transformIndexHtml(html, ctx) {
        if (!html.includes("<!--SITE_META-->")) return html;
        const page = siteMetaPageFromFilename(ctx.filename);
        return html.replace("<!--SITE_META-->", renderSiteMetaHtml(page));
      },
    },
    {
      name: "csp-builder-footer",
      transformIndexHtml(html) {
        if (!html.includes("<!--SITE_FOOTER-->")) return html;
        return html.replace("<!--SITE_FOOTER-->", renderSiteFooterHtml());
      },
    },
    {
      name: "csp-builder-ssg",
      apply: "build",
      transformIndexHtml(html) {
        const rendered = renderIndexAppHtml();
        return html.replace("<!--APP_SSG-->", rendered);
      },
    },
  ],
  build: {
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: "index.html",
        whyCsp: "why-csp.html",
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
