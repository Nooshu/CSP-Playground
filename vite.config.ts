import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import { cspLookupPlugin } from "./server/cspLookupPlugin";
import { SITE_VERSION } from "./src/siteBuildInfo";
import { renderSiteMetaHtml, siteMetaPageFromFilename } from "./src/siteMeta";
import { renderIndexAppHtml } from "./src/ssg/renderIndexApp";
import { renderSiteFooterHtml } from "./src/ui/siteFooter";

function resolveGitCommitShort(): string {
  const githubSha = process.env.GITHUB_SHA?.trim();
  if (githubSha) {
    return githubSha.slice(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const gitCommitShort = resolveGitCommitShort();
const siteBuildInfo = {
  version: SITE_VERSION,
  gitCommitShort,
};

export default defineConfig({
  define: {
    __GIT_COMMIT_SHORT__: JSON.stringify(gitCommitShort),
  },
  root: ".",
  plugins: [
    cspLookupPlugin(),
    {
      name: "csp-playground-site-meta",
      transformIndexHtml(html, ctx) {
        if (!html.includes("<!--SITE_META-->")) return html;
        const page = siteMetaPageFromFilename(ctx.filename);
        return html.replace("<!--SITE_META-->", renderSiteMetaHtml(page));
      },
    },
    {
      name: "csp-playground-footer",
      transformIndexHtml(html) {
        if (!html.includes("<!--SITE_FOOTER-->")) return html;
        return html.replace(
          "<!--SITE_FOOTER-->",
          renderSiteFooterHtml(siteBuildInfo),
        );
      },
    },
    {
      name: "csp-playground-ssg",
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
