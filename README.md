MAS server and web client
=========================

MAS web client is a web application that implements MAS REST API. It is used at [meetandspeak.com][] to provide a web UI.

MAS server is a Node.js application that is the other half of MeetAndSpeak.com service.

MeetAndSpeak is a free advanced chat tool for groups.

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
