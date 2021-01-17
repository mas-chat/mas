import { observable, makeObservable } from 'mobx';

export default class ProfileModel {
  constructor(public readonly nick?: string, public readonly name?: string, public readonly email?: string) {
    makeObservable(this, {
      nick: observable,
      name: observable,
      email: observable
    });
  }
}
