
exports.command = function(nick, password) {
    var browser = this;

    browser
        .url('http://localhost:44199')
        .waitForElementVisible('body', 1000)
        .setValue('input[name="username"]', nick)
        .setValue('input[name="password"]', password)
        .click('#login-form button')
        .waitForElementVisible('.fa-wrench', 1000);

    return this;
};
