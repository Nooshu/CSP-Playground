import { defineConfig } from "vite";
import { cspLookupPlugin } from "./server/cspLookupPlugin";

export default defineConfig({
  root: ".",
  plugins: [cspLookupPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        whyCsp: "why-csp.html",
      },
    },
  },
});
