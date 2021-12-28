interface Config {
  auth: {
    google: boolean;
  };
}

interface Window {
  config: Config;
}

export function getConfig(): Config {
  const globalWindow = window as unknown as Window;
  const config = globalWindow.config;

  return config;
}
