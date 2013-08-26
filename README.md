MAS server and web client
=========================

MAS server and web client form together an advanced web chat application. Both the server and client implement MAS REST API. [Meetandspeak.com][] is an instanse of this application.

Installation
------------

Not really possible right now. Only usable with the new MAS server which is not fully implemented yet. Currently running server at meetandspeak.com is written in Perl and will not be open sourced.

Prerequisites:

- Qooxdoo 3.0 desktop SDK: http://qooxdoo.org/
- Node.js: http://nodejs.org/
- Redis: http://redis.io/
- MySQL: http://www.mysql.com/
- Perl: http://www.perl.org/ (For IRC module, will be replaced with Node.js eventually)

Currently the purpose of this code is to illustrate how MAS REST API can be implemented. This can be helpful when developing native MAS clients.

Plan
----

Complete the new MAS server implementation. Create a bundle that is easy to install.

Feedback
--------

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
