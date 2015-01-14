MAS server and web client
=========================

[![Build Status](https://secure.travis-ci.org/ilkkao/mas.png)](http://travis-ci.org/ilkkao/mas)
[![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat)](https://david-dm.org/ilkkao/mas)
[![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat)](https://david-dm.org/ilkkao/mas#info=devDependencies)

NOTE: Redis database schema will freeze only after 1.0 release. This is also when the project becomes suitable for general use.

MAS is a web chat application. The server part implements MAS
client API. [Meetandspeak.com][] is an instance of this application.

Both the server and web app are currently being rewritten from scratch and are not yet
fully functional.

For more info, see

- [Architecture page](https://github.com/ilkkao/mas/wiki)
- [MAS client API](http://ilkkao.github.io/mas/api.html)

Dependencies:

- Node.js (version 0.11.10 or later): http://nodejs.org/
- Redis: http://redis.io/

## OS support

MacOS/Linux/Windows.

## Quick start

1. Install Redis and latest development release of Node.js (or io.js)

   On Mac you can install [Homebrew](http://brew.sh/) and then do ```brew install redis nodejs-dev```

2. Create the configuration file. You don't need to edit it, default options should work.

   ```bash
   $ cp mas.conf.example mas.conf
   ```

3. Install the required node modules

   ```bash
   $ npm install
   ```

4. Install bower, gulp and ember-cli if you don't have them

   ```bash
   $ npm install -g bower gulp ember-cli
   ```

5. Build the web site

   ```bash
   $ gulp build-assets
   ```

6. Build the client web app

   ```bash
   $ cd client
   $ npm install
   $ bower install
   $ ember build
   ```

6. Launch the server components

   ```bash
   $ ./bin/masctl -c start
   ```

7. Browse to ```http://localhost:3200/``` and register an account.

## masctl

Masctl is an utility for running MAS processes. `./script/masctl -h` shows the available options. In production, use `-b` parameter to daemonize MAS servers.

## Feedback

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
