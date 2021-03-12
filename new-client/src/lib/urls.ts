export const BASE_ID = 9000000;

const encodeId = (id: number): string => (id + BASE_ID).toString(36).toUpperCase();

export const rootUrl = (): string => '/app';

export const welcomeUrl = (): string => '/app/welcome';

export const windowUrl = ({ windowId }: { windowId: number }): string => `/app/c/${encodeId(windowId)}`;

export const windowSettingsUrl = ({ windowId }: { windowId: number }): string =>
  `/app/c/${encodeId(windowId)}/settings`;
