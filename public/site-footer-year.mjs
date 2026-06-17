/**
 * Sets the current year in all footer year placeholders.
 */
const year = String(new Date().getFullYear());

for (const element of document.querySelectorAll(".site-footer-year")) {
  element.textContent = year;
}
