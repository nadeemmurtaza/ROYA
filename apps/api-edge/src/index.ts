import { Container, getContainer } from '@cloudflare/containers';

/**
 * Runs the API (apps/api/Dockerfile) as a Cloudflare Container and puts a Worker in front of it.
 *
 * Why one container and not many: the API keeps 23 @Cron jobs and the outbox dispatcher in-process
 * (docs/OPEN-QUESTIONS.md item 7). A second instance would run every job twice. `max_instances: 1`
 * in wrangler.jsonc and `getContainer()` without a name (one fixed instance) keep it to one.
 *
 * Failure mode: if the container stops, the next request starts it again (a cold start of some
 * seconds) and every in-flight request on it fails once. The database and Redis hold all state, so
 * nothing is lost. Recovery needs no action.
 */

/** Everything the API reads from its environment that this Worker may hold, set as Worker secrets or vars. */
const FORWARDED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_TTL',
  'JWT_REFRESH_TTL',
  'APP_ENCRYPTION_KEY',
  'MODULES',
  'STOREFRONT_URL',
  'CORS_ORIGINS',
  'PAYMENT_PROVIDERS',
  'COURIER_PROVIDERS',
  'NOTIFICATION_CHANNELS',
  'STORAGE_DRIVER',
  'BANK_TRANSFER_DETAILS',
  'STORE_NAME',
  'MAIL_FROM',
  'MAIL_REPLY_TO',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASSWORD',
] as const;

type ForwardedKey = (typeof FORWARDED)[number];

export type Env = {
  ROYA_API: DurableObjectNamespace<RoyaApi>;
} & Partial<Record<ForwardedKey, string>>;

const API_PORT = 3001;

/** A cheap public endpoint, used both as the keep-alive request and by the scheduled check below. */
const READY_PATH = '/api/v1/health/ready';

export class RoyaApi extends Container<Env> {
  defaultPort = API_PORT;
  /**
   * Longer than the 5-minute keep-alive in `scheduled`, so the container never sleeps while the
   * trigger runs. A sleeping container stops the API's scheduled jobs; they resume when it wakes.
   */
  sleepAfter = '15m';

  constructor(ctx: DurableObjectState, env: Env) {
    // @cloudflare/containers is typed against an older DurableObjectState; the object is the same at run time.
    super(ctx as ConstructorParameters<typeof Container<Env>>[0], env);
    const forwarded: Record<string, string> = {};
    for (const key of FORWARDED) {
      const value = env[key];
      if (typeof value === 'string' && value !== '') forwarded[key] = value;
    }
    this.envVars = {
      ...forwarded,
      NODE_ENV: 'production',
      API_PORT: String(API_PORT),
      API_PREFIX: 'api',
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return getContainer(env.ROYA_API).fetch(request);
  },

  /** Cron trigger (see wrangler.jsonc): wakes the container so its own scheduled jobs keep running. */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const response = await getContainer(env.ROYA_API).fetch(new Request(`http://api${READY_PATH}`));
    if (!response.ok) console.error(`keep-alive: ${READY_PATH} answered ${response.status}`);
  },
} satisfies ExportedHandler<Env>;
