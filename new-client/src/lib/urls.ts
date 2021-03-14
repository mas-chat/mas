const BASE_ID = 9000000;
const encodeId = (id: number): string => (id + BASE_ID).toString(36).toUpperCase();

export const rootUrl = (): string => '/app';

export const welcomeUrl = (): string => '/app/c/welcome';

export const profileUrl = (): string => '/app/c/profile';

export const searchUrl = (): string => '/app/c/search';

export const createChannel = (): string => '/app/c/create-channel';

export const joinChannel = (): string => '/app/c/join-channel';

export const windowUrl = ({ windowId }: { windowId: number }): string => `/app/c/${encodeId(windowId)}`;

export const windowSettingsUrl = ({ windowId }: { windowId: number }): string =>
  `/app/c/${encodeId(windowId)}/settings`;

export const parseWindowIdParam = (windowIdParam: string): number => parseInt(windowIdParam, 36) - BASE_ID;
