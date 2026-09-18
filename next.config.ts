import type { NextConfig } from 'next';

/**
 * ARTIFACT_EXPORT builds a fully static copy (`out/`) for the private preview host, which
 * serves files and has no Node runtime. The default build is the normal Next output that
 * Vercel imports with no configuration.
 */
const staticExport = process.env.ARTIFACT_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 writes AGENTS.md/CLAUDE.md on build; this project keeps its own docs in README.md.
  agentRules: false,
  ...(staticExport
    ? { output: 'export' as const, trailingSlash: true, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
