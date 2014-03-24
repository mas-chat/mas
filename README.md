MAS server and web client
=========================

[![Build Status](https://secure.travis-ci.org/ilkkao/mas.png)](http://travis-ci.org/ilkkao/mas)

[![Dependency Status](https://david-dm.org/ilkkao/mas.png)](http://david-dm.org/ilkkao/mas)

![Screenshot](http://i.imgur.com/ls0pagX.png)

MAS is a web chat application. The server part implements MAS
HTTP API. [Meetandspeak.com][] is an instance of this application.

Both the server and web app are currently being rewritten from scratch and are not yet
fully functional.

For more info, see

- [Architecture page](https://github.com/ilkkao/mas/wiki)
- [MAS HTTP client API](https://github.com/ilkkao/mas/blob/master/doc/MAS-client-API.md)

Dependencies:

- Node.js (version 0.11.10 or later): http://nodejs.org/
- Redis: http://redis.io/

OS support
----------

MacOS/Linux/Windows.

Installation
------------

1. Install Redis and latest development release of Node.js

   On Mac you can install [Homebrew](http://brew.sh/) and then do ```brew install redis nodejs-dev```

2. Create the configuration file. You don't need to edit it, default options should work.

   ```bash
   $ cp mas.conf.example mas.conf
   ```

3. Install the required node modules

   ```bash
   $ npm install
   ```

4. Build the web app

   ```bash
   $ grunt dev
   ```

5. Launch the server components

   ```bash
   $ ./scripts/control -c start
   ```

6. Check that all four MAS processes are running ([architecture](https://github.com/ilkkao/mas/wiki))

   ```bash
   $ ./scripts/control status
   mas-frontend: running, pid: 95284
   mas-loopback: running, pid: 95282
   mas-irc: running, pid: 95280
   mas-irc-connman: running, pid: 82417
   ```

7. Browse to ```http://localhost:3200/``` and register an account.

Feedback
--------

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
