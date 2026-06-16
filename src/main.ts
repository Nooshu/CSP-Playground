/**
 * Application entry point: mounts the CSP Builder when `#app` exists.
 */

import { createApp } from "./ui/App";
import "./style.css";

const root = document.getElementById("app");
if (root) {
  createApp(root);
}
