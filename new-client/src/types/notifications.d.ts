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
    userId: 'm4242';
  }>;
}

export interface UpdateNetworks {
  type: 'UPDATE_NETWORKS';
  networks: Array<'mas' | 'IRCNet' | 'FreeNode' | 'W3C'>;
}

export interface UpdateSettings {
  type: 'UPDATE_SETTINGS';
  settings: {
    theme: 'default' | 'dark';
    activeDesktop: number;
    emailConfirmed: boolean;
    canUseIRC: boolean;
  };
}

export interface AddUsers {
  type: 'ADD_USERS';
  mapping: Record<
    string,
    {
      name: string;
      gravatar: string;
      nick: {
        mas: string;
        IRCNet?: string;
        FreeNode?: string;
        W3C?: string;
      };
    }
  >;
}

export type Notification = AddAlert | UpdateFriends | ConfirmFriends | UpdateNetworks | UpdateSettings | AddUsers;
