/**
 * The private preview host serves the app from a path this build cannot know, so the preview
 * build keeps every route in one document and navigates by hash.
 *
 * Deliberately not a 'use client' module: server components read this too, and a constant
 * imported from a client module arrives there as a client reference (always truthy).
 */
export const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW === '1';
