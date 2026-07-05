import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  // Standalone permite rodar em Docker com "node apps/web/server.js".
  output: "standalone",
  reactStrictMode: true,
  // Headers de seguranca em todas as rotas (funcao pura e testada em
  // lib/security-headers.ts).
  async headers() {
    return [
      {
        headers: [...buildSecurityHeaders()],
        source: "/:path*"
      }
    ];
  }
};

export default nextConfig;
