const DEFAULT_API_PORT = 3333;

export interface BrowserLocationLike {
  readonly hostname: string;
  readonly protocol: string;
}

export function resolveOrdersApiBaseUrl(
  envUrl: string | undefined,
  location: BrowserLocationLike | undefined
): string {
  if (envUrl) {
    return envUrl;
  }

  if (location) {
    return `${location.protocol}//${location.hostname}:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}
