/**
 * Application entry point for the CSP Playground client bundle.
 *
 * @remarks
 * Mounts the interactive builder when `#app` is present (all app pages), then
 * ensures the shared site footer exists on static pages such as `/why-csp.html`.
 * Styles are imported here so Vite bundles CSS with the main script graph.
 */

import { createApp } from "./ui/App";
import { ensureSiteFooter } from "./ui/siteFooter";
import "./style.css";

/** Root mount node rendered by {@link renderIndexAppHtml} or static HTML shells. */
const root = document.getElementById("app");
if (root) {
  createApp(root);
}

ensureSiteFooter();
