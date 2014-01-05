MAS server and web client
=========================

MAS server and web client form together an advanced web chat application. Both the server and client implement MAS REST API. [Meetandspeak.com][] is an instanse of this application. Contains currenly still a lot of poor and old code.

Installation
------------

Not really possible right now. Only usable with the new MAS server which is not fully implemented yet.

Prerequisites:

- Qooxdoo 3.0 desktop SDK: http://qooxdoo.org/
- Node.js: http://nodejs.org/
- Redis: http://redis.io/
- Perl: http://www.perl.org/ (For IRC module, will be replaced with Node.js eventually)

Currently the purpose of this code is to illustrate how MAS REST API can be implemented. This can be helpful when developing native MAS clients.

OS support
----------

IRC adapter is Linux only as it uses Linux epoll() system call directly. To be fixed.

Plan
----

Complete the new MAS server implementation. Polish everything. Create a bundle that is easy to install.

Feedback
--------

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
