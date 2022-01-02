import { RemirrorJSON } from 'remirror';

export enum MessageCategory {
  Message = 'msg',
  Info = 'info',
  Server = 'server',
  Banner = 'banner',
  Error = 'error',
  Join = 'join',
  Part = 'part',
  Quit = 'quit',
  Kick = 'kick',
  Action = 'action'
}

export enum MessageStatus {
  Original = 'original',
  Edited = 'edited',
  Deleted = 'deleted'
}

export enum Theme {
  Default = 'default',
  Dark = 'dark',
  DefaultV2 = 'default-v2',
  DarkV2 = 'dark-v2'
}

export enum Network {
  IRCNet = 'ircnet',
  Freenode = 'freenode',
  W3C = 'w3c',
  Mas = 'mas'
}

export type IRCNetwork = Exclude<Network, 'mas'>;

export enum Role {
  User = 'u',
  Voice = 'v',
  Operator = '@',
  Owner = '*'
}

export enum WindowType {
  Group = 'group',
  OneOnOne = '1on1'
}

export type AlertsRecord = {
  email: boolean;
  notification: boolean;
  sound: boolean;
  title: boolean;
};

export type MessageRecord = {
  gid: number;
  userId: string;
  ts: number;
  cat: MessageCategory;
  body: string;
  doc?: RemirrorJSON;
  updatedTs?: number;
  status: MessageStatus;
};

export type WindowRecord = {
  windowId: number;
  name: string;
  userId: string;
  windowType: WindowType;
  network: Network;
  password: string;
  alerts: AlertsRecord;
  topic: string | null;
  role: Role;
  minimizedNamesList: boolean;
  desktop: number;
  row: number;
  column: number;
};

export type UpdatableWindowProperties =
  | 'password'
  | 'topic'
  | 'row'
  | 'column'
  | 'desktop'
  | 'role'
  | 'minimizedNamesList'
  | 'alerts';

export type UpdatableWindowRecord = Partial<Pick<WindowRecord, UpdatableWindowProperties>> & { windowId: number };

export type UserRecord = {
  name: string;
  gravatar: string;
  nick: {
    mas: string;
  } & {
    [key in IRCNetwork]?: string;
  };
};

export interface AddAlert {
  type: 'ADD_ALERT';
  alertId: number;
  message: string;
  ackLabel?: string;
  nackLabel?: false | string;
  postponeLabel?: false | string;
}

export interface UpdateFriends {
  type: 'UPDATE_FRIENDS';
  reset: boolean;
  friends: Array<{
    userId: string;
    online: boolean;
    last?: number;
  }>;
}

export interface ConfirmFriends {
  type: 'CONFIRM_FRIENDS';
  friends: Array<{
    userId: string;
  }>;
}

export interface UpdateNetworks {
  type: 'UPDATE_NETWORKS';
  networks: Array<Network>;
}

export interface UpdateSettings {
  type: 'UPDATE_SETTINGS';
  settings: {
    theme: Theme;
    activeDesktop: number;
    emailConfirmed: boolean;
    canUseIRC: boolean;
  };
}

export interface AddUsers {
  type: 'ADD_USERS';
  mapping: Record<string, UserRecord>;
}

export interface AddMessage extends MessageRecord {
  type: 'ADD_MESSAGE';
  windowId: number;
}

export interface AddMessages {
  type: 'ADD_MESSAGES';
  messages: Array<{
    windowId: number;
    messages: Array<MessageRecord>;
  }>;
}

export interface AddWindow extends WindowRecord {
  type: 'ADD_WINDOW';
}

export interface UpdateWindow extends UpdatableWindowRecord {
  type: 'UPDATE_WINDOW';
}

export interface DeleteWindow {
  type: 'DELETE_WINDOW';
  windowId: number;
}

export interface FinishInit {
  type: 'FINISH_INIT';
}

export interface UpdateMembers {
  type: 'UPDATE_MEMBERS';
  windowId: number;
  reset: boolean;
  members: Array<{
    userId: string;
    role: Role;
  }>;
}

export interface DeleteMembers {
  type: 'DELETE_MEMBERS';
  windowId: number;
  members: Array<{
    userId: string;
  }>;
}

export interface StartupSequence {
  type: 'STARTUP_SEQUENCE';
  length: number;
}

export type Notification =
  | AddAlert
  | UpdateFriends
  | ConfirmFriends
  | UpdateNetworks
  | UpdateSettings
  | AddUsers
  | AddMessage
  | AddMessages
  | AddWindow
  | UpdateWindow
  | DeleteWindow
  | FinishInit
  | UpdateMembers
  | DeleteMembers
  | StartupSequence;
