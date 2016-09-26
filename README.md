MAS server and desktop web app
==============================

MAS is a web group chat application with a sleek windowed UI.

![Screenshot](http://i.imgur.com/dlagvoY.gif)

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

Server: [![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat&path=server)](https://david-dm.org/ilkkao/mas?path=server) [![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat&path=server)](https://david-dm.org/ilkkao/mas?path=server#info=devDependencies)

Client: [![Dependency Status](https://david-dm.org/ilkkao/mas.svg?style=flat&path=client)](https://david-dm.org/ilkkao/mas?path=client) [![devDependency Status](https://david-dm.org/ilkkao/mas/dev-status.svg?style=flat&path=client)](https://david-dm.org/ilkkao/mas?path=client#info=devDependencies)

[![Sauce Test Status](https://saucelabs.com/browser-matrix/mas-ci.svg)](https://saucelabs.com/u/mas-ci)

## Dependencies:

- Node.js: http://nodejs.org/
- Redis: http://redis.io/
- Elasticsearch: https://www.elastic.co/products/elasticsearch/ (optional)

## OS support

MacOS/Linux/Windows.

## Development setup

1. Install Redis and latest release of node.js (6.x)

   On Mac you can do this by installing first [Homebrew](http://brew.sh/) and then

   ```bash
   $ brew install node redis
   ```

2. Build different components and install required npm modules using the dev script

   ```bash
   $ ./dev.sh build
   ```

3. Launch the server components and redis in foreground

   ```bash
   $ ./dev.sh start
   ```

4. Browse to ```http://localhost:3200/``` and register an account.

## Production setup

First add your [default configuration values](https://github.com/ilkkao/mas/blob/master/server/mas.conf.default) overrides
to the `docker-compose.yml` file. Then

   ```bash
   $ mkdir /data
   $ docker-compose up
   ```

## Code Climate

[![Code Climate](https://codeclimate.com/github/ilkkao/mas/badges/gpa.svg)](https://codeclimate.com/github/ilkkao/mas)

## Feedback

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
