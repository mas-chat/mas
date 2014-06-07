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

casper.test.begin('Register new user', 5, function suite(test) {
    casper.start('http://localhost:44199/register', function() {
        this.viewport(1024, 768);
    });

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
        test.assertUrlMatch(/registration-success/, 'Registration succeeded');
    });

    casper.wait(1000);

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
        this.clickLabel('Create new group…');
    });

    casper.waitUntilVisible('.modal-dialog', function() {
        this.fillSelectors('.modal-body form', {
            '#create_group_name': 'test1',
            '#create_group_password': 'none'
        }, false);
    });

    casper.then(function() {
        this.clickLabel('OK', 'button');
    });

    // casper.waitUntilVisible('.window', function() {
    // });

    casper.run(function() {
        test.done();
    });
});
