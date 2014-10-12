/*global fs*/

var prefix = fs.absolute(fs.workingDirectory + '/test/integration');
var helpers = require(prefix + '/lib/helpers');

helpers.setup(casper);

casper.test.begin('Register new user', 9, function suite(test) {
    // Register first user

    casper.start('http://localhost:44199/', function() {
        this.viewport(1024, 768);
    });

    helpers.clearDb(casper);

    helpers.registerUser(casper, test, {
        name: 'Bruce Lee',
        email: 'bruce@lee.com',
        password: 'brucelee',
        nick: 'bruce'
    });

    casper.waitForText('Welcome!', function() {
        test.assertUrlMatch(/\/app$/, 'Was redirected to the app');
        this.click('.fa-plus');
    });

    casper.waitForText('Join IRC channel…', function() {
        this.clickLabel('Join IRC channel…');
    });

    casper.waitUntilVisible('.modal-dialog', function() {
        this.fillSelectors('.modal-body form', {
            '#join_irc_name': '#hong_kong'
        }, false);
    });

    casper.then(function() {
        this.clickLabel('OK');
    });

    casper.waitWhileVisible('.modal-dialog', function() {
        this.click('.fa-wrench');
    });

    casper.waitForText('Logout', function() {
        this.clickLabel('Logout');
    });

    casper.wait(1000);

    // Register second user

    helpers.registerUser(casper, test, {
        name: 'Jackie Chan',
        email: 'jackie@chan.com',
        password: 'jackiechan',
        nick: 'jackie'
    });

    casper.then(function() {
        test.assertTextExists('Welcome!', 'Second registration succeeded');
        test.assertUrlMatch(/\/app$/, 'Was redirected to the app');
        this.click('.fa-plus');
    });

    casper.waitForText('Join IRC channel…', function() {
        this.clickLabel('Join IRC channel…');
    });

    casper.waitUntilVisible('.modal-dialog', function() {
        this.fillSelectors('.modal-body form', {
            '#join_irc_name': '#hong_kong'
        }, false);
    });

    casper.then(function() {
        this.clickLabel('OK');
    });

    casper.waitForText('has joined channel', function() {
        this.fillSelectors('.window form', {
            '.form-control': 'Works finally!'
        }, true);
    });

    casper.wait(1000);

    casper.then(function() {
        this.click('.fa-wrench');
    });

    casper.waitForText('Logout', function() {
        this.clickLabel('Logout');
    });

    casper.wait(1000);

    // Log in as first user to verify sent text

    helpers.loginUser(casper, test, {
        username: 'bruce@lee.com',
        password: 'brucelee'
    });

    casper.waitForText('Works finally!', function() {
        this.echo('Message from another user exists', 'INFO');
    });

    casper.run(function() {
        test.done();
    });
});
