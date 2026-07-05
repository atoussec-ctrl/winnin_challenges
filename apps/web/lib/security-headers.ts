export interface HttpHeader {
  readonly key: string;
  readonly value: string;
}

const ANILIST_IMAGE_HOST = "https://s4.anilist.co";
const ANILIST_GRAPHQL_HOST = "https://graphql.anilist.co";

// CSP em Report-Only: mede violacoes sem quebrar o render. Uma versao enforcing
// exige nonce por request (via middleware) no lugar de 'unsafe-inline' nos
// scripts do Next — proximo passo, ver docs/15-backlog.md (SEC-02).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  `img-src 'self' data: ${ANILIST_IMAGE_HOST}`,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${ANILIST_GRAPHQL_HOST}`,
  "font-src 'self'",
  "object-src 'none'"
].join("; ");

// Headers de seguranca aplicados a todas as rotas pelo next.config.ts.
// Funcao pura para poder ser testada sem subir o Next.
export function buildSecurityHeaders(): readonly HttpHeader[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY }
  ];
}
