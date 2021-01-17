import { computed, observable, makeObservable } from 'mobx';
import userStore from '../stores/UserStore';

export default class FriendModel {
  constructor(public readonly userId: string, public readonly online: boolean, public readonly last?: number) {
    makeObservable(this, {
      last: observable,
      online: observable,
      name: computed
    });
  }

  get name(): string | null {
    return userStore.users.get(this.userId)?.name || null;
  }
}
