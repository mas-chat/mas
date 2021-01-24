export type MessageCategory =
  | 'msg'
  | 'info'
  | 'server'
  | 'banner'
  | 'error'
  | 'join'
  | 'part'
  | 'quit'
  | 'kick'
  | 'action';

export type MessageStatus = 'original' | 'edited';

export type Theme = 'default' | 'dark';

export type Network = 'IRCNet' | 'FreeNode' | 'W3C' | 'mas';

export type IRCNetwork = Exclude<Network, 'mas'>;

export type Role = 'u' | 'v' | '@' | '*';

export type WindowType = 'group' | '1on1';

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
  | DeleteMembers;
