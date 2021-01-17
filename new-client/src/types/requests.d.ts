import { Network, MessageRecord, AlertsRecord } from './notifications';

export interface CreateRequest {
  id: 'CREATE';
  name: string;
  password: string;
}

export interface CreateAcknowledgment {
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

export interface DestroyAccount {
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

export type RequestReturn<T> = T extends CreateRequest
  ? CreateAcknowledgment
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
  : T extends UpdateRequest
  ? UpdateAcknowledgement
  : T extends RequestFriendRequest
  ? RequestFriendAcknowledgement
  : T extends UpdateProfileRequest
  ? UpdateProfileAcknowledgement
  : T extends GetProfileRequest
  ? GetProfileAcknowledgement
  : never;
