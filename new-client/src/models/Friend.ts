import { computed, observable, makeObservable } from 'mobx';
import UserModel from './User';

type FriendModelProps = {
  user: UserModel;
  online: boolean;
  last?: number;
};

export default class FriendModel {
  public readonly user: UserModel;
  public readonly online: boolean;
  public readonly last?: number;

  constructor({ user, online, last }: FriendModelProps) {
    this.user = user;
    this.online = online;
    this.last = last;

    makeObservable(this, {
      last: observable,
      online: observable,
      name: computed
    });
  }

  get name(): string {
    return this.user.name;
  }
}
