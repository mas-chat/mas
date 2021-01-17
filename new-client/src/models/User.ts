import { observable, makeObservable } from 'mobx';

export default class UserModel {
  constructor(
    public readonly nick: { mas: string; IRCNet?: string; FreeNode?: string; W3C?: string },
    public readonly name: string,
    public readonly gravatar: string
  ) {
    makeObservable(this, {
      nick: observable,
      name: observable,
      gravatar: observable
    });
  }
}
