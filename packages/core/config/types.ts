/**
 * Application configuration interface
 * All configs (dev, prod, generated) must match this interface
 */
export interface AppConfig {
  readonly api: {
    readonly endpoint: string;
  };
}
