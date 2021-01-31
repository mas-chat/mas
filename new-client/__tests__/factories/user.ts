import UserModel, { UserModelProps } from '../../src/models/User';

let sequence = 0;

function build(overrides: Partial<UserModelProps> = {}): UserModel {
  sequence++;

  return new UserModel({
    id: `m${sequence}`,
    nick: { mas: `tester${sequence}` },
    name: `Test person ${sequence}`,
    ...overrides
  });
}

export default {
  build
};
