import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default (no incremental cache) for the first deploy: every page renders per request and
// reads the API, so nothing can be served stale. See docs/CLOUDFLARE.md for turning on R2 caching.
export default defineCloudflareConfig();
