// Common start

function captureAndExit() {
    casper.log('Test failed. Taking screenshot', 'info');
    casper.capture('fail.png');
    casper.exit(1);
}

casper.on('page.error', function(msg, trace) {
    this.echo('Error on page: ' + msg + 'Trace: ' + trace);
    captureAndExit();
});

// Common end. TBD: Split to a separate file when slimerjs is fixed

casper.test.begin('Register new user', 8, function suite(test) {
    // Register first user

    casper.start('http://localhost:44199/register', function() {
        this.viewport(1024, 768);
    });

    casper.waitForResource(/pages-libs\.js$/, function() {
        test.assertTitle('MAS - Register', 'MAS register page title is the one expected');
        test.assertExists('form[action="/register"]', 'Main form is found');
        this.fill('form[action="/register"]', {
            name: 'Bruce Lee',
            email: 'bruce@lee.com',
            password: 'brucelee',
            confirm: 'brucelee',
            nick: 'bruce',
            tos: true
        }, true);
    });

    casper.then(function() {
        test.assertTextExists('Welcome!', 'First registration succeeded');
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

    casper.thenOpen('http://localhost:44199/register');

    casper.waitForResource(/pages-libs\.js$/, function() {
        test.assertTitle('MAS - Register', 'MAS register page title is the one expected');
        test.assertExists('form[action="/register"]', 'Main form is found');
        this.fill('form[action="/register"]', {
            name: 'Jackie Chan',
            email: 'jackie@chan.com',
            password: 'jackiechan',
            confirm: 'jackiechan',
            nick: 'jackie',
            tos: true
        }, true);
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

    casper.thenOpen('http://localhost:44199');

    casper.waitForResource(/pages-libs\.js$/, function() {
        this.fill('form#login-form', {
            username: 'bruce@lee.com',
            password: 'brucelee'
        }, true);
    });

    casper.waitForText('Works finally!', function() {
        this.echo('Message from another user exists', 'INFO');
    });

    casper.run(function() {
        test.done();
    });
});
