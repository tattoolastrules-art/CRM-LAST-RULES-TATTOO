import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autocontenido para desplegar como Node app en cPanel (Passenger).
  output: "standalone",
};

export default nextConfig;
