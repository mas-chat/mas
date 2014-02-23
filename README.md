MAS server and web client
=========================

[![Build Status](https://secure.travis-ci.org/ilkkao/mas.png)](http://travis-ci.org/ilkkao/mas)

[![Dependency Status](https://david-dm.org/ilkkao/mas.png)](http://david-dm.org/ilkkao/mas)

![Screenshot](http://i.imgur.com/McO0nas.png)

MAS is a web chat application. The server part implements MAS
HTTP API. [Meetandspeak.com][] is an instance of this application.

Both the server and web app are currently being rewritten from scratch and are not yet
fully functional.

For more info, see

- [Architecture page](https://github.com/ilkkao/mas/wiki)
- [MAS HTTP API](https://github.com/ilkkao/mas/blob/master/doc/MAS-REST-API.md)

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

2. Create and inspect the configuration file

   ```bash
   $ cp mas.conf.example mas.conf
   ```

3. Launch the server components

   ```bash
   $ ./scripts/launch
   ```

4. Check that all four MAS processes are running ([architecture](https://github.com/ilkkao/mas/wiki))

   ```bash
   $ ps aux | grep mas-
   ilkkao   40955   0.0  0.6  3107760  47560 s000  S  7:18PM   0:01.09 mas-irc
   ilkkao   40953   0.0  0.5  3106736  44300 s000  S  7:18PM   0:00.91 mas-irc-connman
   ilkkao   40961   0.0  1.1  3123840  93592 s000  S  7:18PM   0:04.51 mas-frontend
   ilkkao   40958   0.0  0.4  3104688  33904 s000  S  7:18PM   0:00.49 mas-loopback
   ```

5. Browse to ```http://localhost:3200/``` and register an account.

Next steps
----------

Complete the new MAS server implementation. Polish everything. Create
a bundle that is easy to install.

Feedback
--------

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
