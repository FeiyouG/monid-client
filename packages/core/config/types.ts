/**
 * Application configuration interface
 * All configs (dev, prod, generated) must match this interface
 */
export interface AppConfig {
  readonly oauth: {
    readonly domain: string;
    readonly clientId: string;
    readonly type: "clerk";
    readonly redirectUri: string;
    readonly scopes: readonly string[];
  };
  readonly api: {
    readonly endpoint: string;
    readonly dashboardUrl: string;
  };
}
