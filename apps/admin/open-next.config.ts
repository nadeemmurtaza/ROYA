import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No incremental cache or queue: the back office is signed-in, per-person pages
// that read the API on every request, so there is nothing worth caching at the edge.
export default defineCloudflareConfig();
