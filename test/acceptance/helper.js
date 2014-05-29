casper.on('page.error', function(msg, trace) {
    this.echo('Error on page: ' + msg, ', Trace: ' + trace);

    this.capture('fail.png');
    this.exit(1);
});
