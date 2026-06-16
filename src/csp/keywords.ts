export interface KeywordOption {
  value: string;
  label: string;
  quoted: boolean;
}

export const KEYWORD_OPTIONS: KeywordOption[] = [
  { value: "'self'", label: "'self'", quoted: true },
  { value: "'none'", label: "'none'", quoted: true },
  { value: "'unsafe-inline'", label: "'unsafe-inline'", quoted: true },
  { value: "'unsafe-eval'", label: "'unsafe-eval'", quoted: true },
  { value: "'wasm-unsafe-eval'", label: "'wasm-unsafe-eval'", quoted: true },
  { value: "'strict-dynamic'", label: "'strict-dynamic'", quoted: true },
  { value: "'unsafe-hashes'", label: "'unsafe-hashes'", quoted: true },
  {
    value: "'inline-speculation-rules'",
    label: "'inline-speculation-rules'",
    quoted: true,
  },
  { value: "'report-sample'", label: "'report-sample'", quoted: true },
  { value: "'trusted-types-eval'", label: "'trusted-types-eval'", quoted: true },
  { value: "https:", label: "https:", quoted: false },
  { value: "http:", label: "http:", quoted: false },
  { value: "data:", label: "data:", quoted: false },
  { value: "blob:", label: "blob:", quoted: false },
];
