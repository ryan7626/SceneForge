import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@livekit/agents", "@livekit/agents-plugin-openai"],
};

export default nextConfig;
