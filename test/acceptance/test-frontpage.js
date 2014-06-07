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

casper.test.begin('Load frontpage', 2, function suite(test) {
    casper.start('http://localhost:44199/', function() {
        test.assertTitle('MAS -', 'MAS homepage title is the one expected');
        test.assertExists('#mas-logo', 'main logo is found');
    });

    casper.run(function() {
        test.done();
    });
});
