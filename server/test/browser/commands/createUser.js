const User = require('../../../models/user');

exports.command = function command(options = {}) {
  const browser = this;

  browser.perform(async (client, done) => {
    // Defaults
    const defaults = {
      name: 'Joe Random',
      email: 'user@mas.com',
      inUse: true,
      canUseIRC: true,
      password: '123456',
      nick: 'user1'
    };

    await User.create(Object.assign(defaults, options));
    done();
  });

  return this;
};
