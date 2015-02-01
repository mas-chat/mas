MAS server and desktop web app
==============================

MAS is a web group chat application.

NOTE: Redis database schema will freeze only after 1.0 release. This is also when the project becomes suitable for general use.

For more info, see

- [Architecture page](https://github.com/ilkkao/mas/wiki)
- [MAS client API](http://ilkkao.github.io/mas/api.html)

## Status:

[![Build Status](https://secure.travis-ci.org/ilkkao/mas.png)](http://travis-ci.org/ilkkao/mas)
[![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat)](https://david-dm.org/ilkkao/mas)
[![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat)](https://david-dm.org/ilkkao/mas#info=devDependencies)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/mas-ci.svg)](https://saucelabs.com/u/mas-ci)

## Dependencies:

- io.js: http://iojs.org/
- Redis: http://redis.io/

## OS support

MacOS/Linux/Windows.

## Quick start

1. Install Redis and latest release of io.js

   On Mac to get redis you can install [Homebrew](http://brew.sh/) and then do ```brew install redis```

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
7. Launch redis in one window

  ```bash
  $ redis-server
  ```

8. Launch the server components

   ```bash
   $ ./bin/masctl -c start
   ```

9. Browse to ```http://localhost:3200/``` and register an account.

## masctl

Masctl is an utility for running MAS processes. `./script/masctl -h` shows the available options. In production, use `-b` parameter to daemonize MAS servers.

## Code Climate

[![Code Climate](https://codeclimate.com/github/ilkkao/mas/badges/gpa.svg)](https://codeclimate.com/github/ilkkao/mas)

## Feedback

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
