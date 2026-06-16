# CSP Builder

A browser-based tool for building [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) (CSP) headers. Enable directives, pick common keywords, add custom source URLs, and copy the generated policy for your web server.

## Features

- Form-based editor for all standard CSP directives (fetch, document, navigation, reporting, and other)
- Keyword dropdown for common values (`'self'`, `'none'`, `'unsafe-inline'`, schemes, and more)
- Multiple source inputs per directive with add/remove controls
- Live preview of the policy value and full HTTP header
- Export snippets for Apache, Nginx, Caddy, LiteSpeed, Microsoft IIS, Traefik, and Envoy
- Accessible UI with semantic HTML, labels, focus styles, and screen reader feedback

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/)

### Install

```bash
yarn install
```

### Development

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
yarn build
```

Static files are output to `dist/`. Preview the production build with:

```bash
yarn preview
```

## Usage

1. Enable a directive (e.g. `default-src`) using its checkbox.
2. Add keywords from the dropdown or enter custom sources (e.g. `https://cdn.example.com`).
3. Review the generated policy in the preview panel at the bottom.
4. Copy the policy, full header, or web server configuration snippet.

Toggle **Content-Security-Policy-Report-Only** to generate a report-only header for testing.

## License

[CC0 1.0 Universal](LICENSE)
