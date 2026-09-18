import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 writes AGENTS.md/CLAUDE.md on build; this project keeps its own docs in README.md.
  agentRules: false,
  // The prototype is a client-side app over sample data, so it deploys to Vercel with no
  // extra configuration: `next build`, no server runtime of its own, no environment variables.
};

export default nextConfig;
