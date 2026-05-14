import type { NextConfig } from "next";

// We deploy under a custom domain (tritondft.com) → serve at root.
// No basePath needed. yil384.github.io/TritonDFT-frontend/ will be
// auto-redirected to the custom domain by GitHub Pages.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
