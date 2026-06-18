/**
 * Application entry point: mounts CSP Playground when `#app` exists.
 */

import { createApp } from "./ui/App";
import { ensureSiteFooter } from "./ui/siteFooter";
import "./style.css";

const root = document.getElementById("app");
if (root) {
  createApp(root);
}

ensureSiteFooter();
