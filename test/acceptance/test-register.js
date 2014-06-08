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

casper.test.begin('Register new user', 11, function suite(test) {
    casper.start('http://localhost:44199/register', function() {
        this.viewport(1024, 768);
    });

    // Register two users

    casper.waitForResource(/jquery\.cookie\.js$/, function() {
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
        test.assertTitle('MAS - registration-success', 'Title is ok');
        test.assertUrlMatch(/registration-success/, 'First registration succeeded');
    });

    casper.wait(1000);

    casper.thenOpen('http://localhost:44199/register');

    casper.waitForResource(/jquery\.cookie\.js$/, function() {
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
        test.assertTitle('MAS - registration-success', 'Title is ok');
        test.assertUrlMatch(/registration-success/, 'Second registration succeeded');
    });

    casper.wait(1000);

    // Log in first user

    casper.thenOpen('http://localhost:44199');

    casper.waitForResource(/jquery\.cookie\.js$/, function() {
        this.fill('form#login-form', {
            emailOrNick: 'bruce@lee.com',
            password: 'brucelee',
        }, true);
    });

    casper.waitForUrl('http://localhost:44199/app/', function() {
        test.assertTitle('MAS', 'Title is ok');
        this.click('.glyphicon-plus');
    });

    casper.then(function() {
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

    casper.wait(5000);

    // Log in second user

    casper.thenOpen('http://localhost:44199');

    casper.waitForResource(/jquery\.cookie\.js$/, function() {
        this.fill('form#login-form', {
            emailOrNick: 'jackie@chan.com',
            password: 'jackiechan',
        }, true);
    });

    casper.waitForUrl('http://localhost:44199/app/', function() {
        test.assertTitle('MAS', 'Title is ok');
        this.click('.glyphicon-plus');
    });

    casper.then(function() {
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

    casper.wait(5000);

    casper.waitUntilVisible('.window', function () {
        this.fillSelectors('.window form', {
            '.form-control': 'Works finally!'
        }, true);
    });

    casper.wait(1000);

    // Log in as first user to verify sent text

    casper.thenOpen('http://localhost:44199');

    casper.waitForResource(/jquery\.cookie\.js$/, function() {
        this.fill('form#login-form', {
            emailOrNick: 'bruce@lee.com',
            password: 'brucelee',
        }, true);
    });

    casper.waitForUrl('http://localhost:44199/app/', function() {
        test.assertTextExists('Works finally!', 'Message from another user is visible');
    });

    casper.run(function() {
        test.done();
    });
});
