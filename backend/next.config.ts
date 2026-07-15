import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
    turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
