MAS server and web client
=========================

MAS is an advanced web chat application. The server part provides MAS
REST API. [Meetandspeak.com][] is an instance of this application.

The server is currently being rewritten from scratch and is not yet
fully functional.

Installation
------------

Not really possible right now. Only usable when the new MAS server is
feature complete. The old server implementation is not available
publicly.

Prerequisites:

- Qooxdoo desktop SDK (version 3.5): http://qooxdoo.org/
- Node.js (version 0.11.10 or later): http://nodejs.org/
- Redis: http://redis.io/
- Perl: http://www.perl.org/ (For the IRC apapter, will be replaced with Node.js eventually)

OS support
----------

IRC adapter is Linux only as it uses Linux epoll() system call directly. To be changed.

Plan
----

Complete the new MAS server implementation. Polish everything. Create a bundle that is easy to install.

Feedback
--------

iao@iki.fi

[meetandspeak.com]: http://meetandspeak.com/
