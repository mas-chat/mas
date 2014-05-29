require('./helper.js');

casper.test.begin('Load frontpage', 2, function suite(test) {
    casper.start('http://localhost:44199/', function() {
        test.assertTitle('MAS -', 'MAS homepage title is the one expected');
        test.assertExists('#mas-logo', 'main logo is found');
        this.capture('screenshot.png');
    });

    casper.run(function() {
        test.done();
    });
});
