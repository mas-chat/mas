import { observable, makeObservable } from 'mobx';

type ProfileModelProps = {
  name: string;
  email: string;
};

export default class ProfileModel {
  public name: string;
  public email: string;

  constructor({ name, email }: ProfileModelProps) {
    this.name = name;
    this.email = email;

    makeObservable(this, {
      name: observable,
      email: observable
    });
  }
}
