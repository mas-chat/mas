import { Network, MessageRecord, AlertsRecord } from './notifications';

export interface CreateRequest {
  id: 'CREATE';
  name: string;
  password: string;
}

export interface CreateAcknowledgement {
  status: 'OK' | 'ERROR_NAME_MISSING' | 'ERROR_EXISTS';
  errorMsg?: string;
}

export interface SendRequest {
  id: 'SEND';
  text: string;
  windowId: number;
}

export interface SendAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
  ts?: number;
  gid?: number;
}

export interface CommandRequest {
  id: 'COMMAND';
  command: string;
  params: string;
  windowId: number;
}

export interface CommandAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface JoinRequest {
  id: 'JOIN';
  network: Network;
  name: string;
  password: string;
}

export interface JoinAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface ChatRequest {
  id: 'CHAT';
  userId: string;
  network: Network;
}

export interface ChatAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface FetchRequest {
  id: 'FETCH';
  windowId: number;
  start?: number;
  end: number;
  limit?: number;
}

export interface FetchAcknowledgement {
  msgs: Array<MessageRecord>;
}

export interface EditRequest {
  id: 'EDIT';
  windowId: number;
  gid: number;
  text: string;
}

export interface EditAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface CloseRequest {
  id: 'CLOSE';
  windowId: number;
}

export interface CloseAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface UpdatePasswordRequest {
  id: 'UPDATE_PASSWORD';
  windowId: number;
  password: string;
}

export interface UpdatePasswordAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface UpdateTopicRequest {
  id: 'UPDATE_TOPIC';
  windowId: number;
  topic: string;
}

export interface UpdateTopicAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface FriendVerdictRequest {
  id: 'FRIEND_VERDICT';
  userId: string;
  allow: boolean;
}

export interface RequestFriendRequest {
  id: 'REQUEST_FRIEND';
  userId: string;
}

export interface RequestFriendAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface UpdateRequest {
  id: 'UPDATE';
  windowId: number;
  alerts?: AlertsRecord;
  desktop?: number;
  column?: number;
  row?: number;
  minimizedNamesList?: boolean;
}

export interface UpdateAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface LogoutRequest {
  id: 'LOGOUT';
  allSessions: boolean;
}

export interface DestroyAccountRequest {
  id: 'DESTROY_ACCOUNT';
}

export interface UpdateProfileRequest {
  id: 'UPDATE_PROFILE';
  name?: string;
  email?: string;
}

export interface UpdateProfileAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface GetProfileRequest {
  id: 'GET_PROFILE';
}

export interface GetProfileAcknowledgement {
  nick: string;
  name: string;
  email: string;
}

export interface SendConfirmEmailRequest {
  id: 'SEND_CONFIRM_EMAIL';
}

export interface SetRequest {
  id: 'SET';
  settings: {
    theme?: string;
    activeDesktop?: number;
  };
}

export interface SetAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface AckAlertRequest {
  id: 'ACKALERT';
  alertId: number;
}

export interface AckAlertAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export interface RemoveFriendRequest {
  id: 'REMOVE_FRIEND';
  userId: string;
}

export interface RemoveFriendAcknowledgement {
  status: 'OK' | 'ERROR';
  errorMsg?: string;
}

export type Request =
  | CreateRequest
  | SendRequest
  | CommandRequest
  | JoinRequest
  | ChatRequest
  | FetchRequest
  | EditRequest
  | CloseRequest
  | UpdatePasswordRequest
  | UpdateTopicRequest
  | FriendVerdictRequest
  | RequestFriendRequest
  | UpdateRequest
  | LogoutRequest
  | DestroyAccountRequest
  | UpdateProfileRequest
  | GetProfileRequest
  | SendConfirmEmailRequest
  | SetRequest
  | AckAlertRequest
  | RemoveFriendRequest;

export type Acknowledgement =
  | CreateAcknowledgement
  | SendAcknowledgement
  | CommandAcknowledgement
  | JoinAcknowledgement
  | ChatAcknowledgement
  | FetchAcknowledgement
  | EditAcknowledgement
  | CloseAcknowledgement
  | UpdatePasswordAcknowledgement
  | UpdateTopicAcknowledgement
  | RequestFriendAcknowledgement
  | UpdateAcknowledgement
  | UpdateProfileAcknowledgement
  | GetProfileAcknowledgement
  | SetAcknowledgement
  | AckAlertAcknowledgement
  | RemoveFriendAcknowledgement;

export type RequestReturn<T extends Request> = T extends CreateRequest
  ? CreateAcknowledgement
  : T extends SendRequest
  ? SendAcknowledgement
  : T extends CommandRequest
  ? CommandAcknowledgement
  : T extends JoinRequest
  ? JoinAcknowledgement
  : T extends ChatRequest
  ? ChatAcknowledgement
  : T extends FetchRequest
  ? FetchAcknowledgement
  : T extends EditRequest
  ? EditAcknowledgement
  : T extends CloseRequest
  ? CloseAcknowledgement
  : T extends UpdatePasswordRequest
  ? UpdatePasswordAcknowledgement
  : T extends UpdateTopicRequest
  ? UpdateTopicAcknowledgement
  : T extends RequestFriendRequest
  ? RequestFriendAcknowledgement
  : T extends UpdateRequest
  ? UpdateAcknowledgement
  : T extends UpdateProfileRequest
  ? UpdateProfileAcknowledgement
  : T extends GetProfileRequest
  ? GetProfileAcknowledgement
  : T extends SetRequest
  ? SetAcknowledgement
  : T extends AckAlertRequest
  ? AckAlertAcknowledgement
  : T extends RemoveFriendRequest
  ? RemoveFriendAcknowledgement
  : never;
