MAS server and desktop web app
==============================

MAS is a web group chat application with a sleek windowed UI.

![Screenshot](http://i.imgur.com/dlagvoY.gif)

**NOTE: The project is currently under a big refactor. Code in master branch probably doesn't even start.**

*NOTE:* Redis database format will change before 1.0 release. Supported migration tool is not guaranteed. After 1.0 release, mas becomes suitable for the general use.

For more info, see

- [Architecture page](https://github.com/ilkkao/mas/wiki)
- [MAS client API](https://github.com/ilkkao/mas/blob/master/doc/MAS-client-API.md)

## Main features

- Next generation windowed UI
- Messages can include mentions, links, emojis, markdown, images, and youtube videos
- Opt-in email alerts of missed messages
- Infinite scrolling to get older messages
- Another view to browse messages by group and date
- Contacts list with precense information
- Support for 1on1s, local groups and IRC channels (IRC backend implements RFC 2812)
- IRC connections are kept active also when the user is not logged in
- Separate mobile mode

## Status:

[![Build Status](https://secure.travis-ci.org/ilkkao/mas.png)](http://travis-ci.org/ilkkao/mas)

Server: [![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat)](https://david-dm.org/ilkkao/mas) [![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat)](https://david-dm.org/ilkkao/mas#info=devDependencies)

Client: [![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat&path=client)](https://david-dm.org/ilkkao/mas?path=client) [![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat&path=client)](https://david-dm.org/ilkkao/mas?path=client#info=devDependencies)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/mas-ci.svg)](https://saucelabs.com/u/mas-ci)

## Dependencies:

- Node.js: http://nodejs.org/
- Redis: http://redis.io/
- Elasticsearch: https://www.elastic.co/products/elasticsearch/ (optional)

## OS support

MacOS/Linux/Windows.

## Quick start

1. Install Redis and latest release of node.js (5.x)

   On Mac to get redis and node.js you can install [Homebrew](http://brew.sh/) and then do ```brew install node redis```

2. Create the configuration file. You don't need to edit it, default options should work.

   ```bash
   $ cp mas.conf.example mas.conf
   ```

3. Install the required node modules

   ```bash
   $ npm install
   ```

4. Install bower and ember-cli if you don't have them

   ```bash
   $ npm install -g bower ember-cli
   ```

5. Build the web site

   ```bash
   $ npm run build-pages
   ```

6. Build the client web app

   ```bash
   $ cd client
   $ npm install
   $ bower install
   $ ember build
   ```
7. Launch redis in one terminal

  ```bash
  $ redis-server
  ```

8. Launch the server components

   ```bash
   $ pm2 start apps.json
   ```

9. Browse to ```http://localhost:3200/``` and register an account.

## Code Climate

[![Code Climate](https://codeclimate.com/github/ilkkao/mas/badges/gpa.svg)](https://codeclimate.com/github/ilkkao/mas)

## Feedback

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
