require('helper');

casper.test.begin('Register new user', 4, function suite(test) {
    casper.start('http://localhost:44199/register', function() {
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

    casper.run(function() {
        test.done();
    });
});