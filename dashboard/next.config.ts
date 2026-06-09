import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O projeto vive dentro de um repo maior (caveo_analist_ai) que tem seu
  // próprio lockfile; fixamos a raiz do Turbopack neste diretório.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
