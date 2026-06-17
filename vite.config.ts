import { defineConfig } from "vite";
import { cspLookupPlugin } from "./server/cspLookupPlugin";
import { renderIndexAppHtml } from "./src/ssg/renderIndexApp";

export default defineConfig({
  root: ".",
  plugins: [
    cspLookupPlugin(),
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
    rollupOptions: {
      input: {
        main: "index.html",
        whyCsp: "why-csp.html",
      },
    },
  },
});
