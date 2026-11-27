import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The old explainer page is now the "How it pays" section on the home page.
  async redirects() {
    return [{ source: "/how-it-works", destination: "/#pay", permanent: true }];
  },
  turbopack: {
    // web/ is its own app inside the bhav repo; keep Turbopack rooted here.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
