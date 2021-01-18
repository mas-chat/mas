import { computed, observable, makeObservable } from 'mobx';
import UserModel from './User';

export default class FriendModel {
  constructor(public readonly user: UserModel, public readonly online: boolean, public readonly last?: number) {
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
