import { hostForUrl } from './config';

export interface StartupBannerOptions {
  readonly authToken?: string;
  readonly host: string;
  /** Compatibility field name; this is the resolved Echadron home. */
  readonly kimiCodeHome: string;
  readonly port: number;
}

export function formatStartupBanner(options: StartupBannerOptions): string {
  const authStatus = options.authToken === undefined ? 'auth=disabled' : 'auth=required';
  return (
    `[vis-server] listening on http://${hostForUrl(options.host)}:${String(options.port)} ` +
    `(${authStatus}, ECHADRON_HOME=${options.kimiCodeHome})\n`
  );
}
