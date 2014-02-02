
MAS REST API
============

Work in progress.

Introduction
============

MAS protocol is server driven and uses long polling. Overall approach is:

1. The client sends an **initial MAS listen request**
2. The server responds with N commands.
   - These commands allow the client to draw the initial UI view.
3. The client sends **MAS listen request**
   - If the server doesn't have anything to send (e.g. no new messages), HTTP connection is blocked up to 30 seconds. If 30 seconds is reached and there is still nothing to send, the server
     closes the connection and responds with an empty commands list.
4. The client builds or updates the UI by processing all the commands (if any)
5. The client immediately goes back to step 3.
   - In case of any transport errors, client SHALL wait few seconds before proceeding.

When the user a triggers an action, e.g. wants to join a new channel,
client creates a second HTTP connection to sends **MAS send request**. Server
responds to this message immediately.

Authentication
==============

All MAS listen and send requests must contain an authentication cookie. Cookie format is ...

Session management
==================

The user is allowed to have only one active connection to the server. A new session ID is generated after every initial MAS listen request. This effectively invalidates the
session ID that the possible another client started previously is using.

If the session ID becomes invalid, the server will respond with the HTTP status code
```not acceptable```. In this case the client should not reconnect using the initial
MAS listen request without user interaction to avoid loop between two clients.


MAS listen request
==================

```HTTP GET /api/listen/<sessionId>/<listenSeq>/[timezone]```

**sessionId**: Must be set to 0 in the initial listen request. In other requests sessionID
must be set to value that the server returned with SESSIONID command.

**listenSeq**: Must be set to 0 in the initial listen request. Must be then increased by one after every received HTTP response from the server.

**timezone**: Optional. Can set to update user's current timezone in the first listen
request. For example ```120``` if the user is in Helsinki (+2:00 GMT)

Overal server response format to MAS listen request is:

```JSON
[
    {
        "id":"ADDTEXT"
         "body":"How are you?",
         "cat":"msg",
         "window":2,
         "ts":341,
         "nick":"neo",
         "type":1,
    },
    {
         "id":"ADDTEXT"
         "body":"Good, thanks.",
         "cat":"notice",
         "window":2,
         "ts":348,
         "nick":"morpheus",
         "type":1,
    },

    ...

]
```

HTTP status codes:

```200``` OK
```401``` Unauthenticated. New login needed.
```406``` Session expired. Reset listenSeq to 0 to restart the session. There can be only one active session. Ask confirmation from user before doing the reset to avoid looping between two or more clients.

Below is the list of commands that MAS server can send to a client.
A command is always request for the client to take some action.

ADDNAME
-------

Add a new nick to window participant list.

```JSON
{
   "id":"ADDNAME",

   "window":1,
   "nick":"@zorro"
}
```

ADDNTF
------

Add a new sticky message to window.

```JSON
{
   "id":"ADDURL",

   "window":1,
   "noteid":42,
   "body":"Next meeting tomorrow at 4PM"
}
```

ADDURL
------

Add a new url to window url list.

```JSON
{
   "id":"ADDURL",

   "window":1,
   "url":"http://google.com"
}
```

ADDTEXT
-------

Add a messge to window.

```JSON
{
   "id":"ADDTEXT",

   "window":1,
   "body":"Hello worlds!",
   "cat":"notice",
   "ts":"209",
   "nick":"ilkka2",
   "type":0
}
```

BANLIST
-------

Update window ban list.

```JSON
{
   "id":"BANLIST",

   "window":1,
   "list":[
      "banId":42,
      "info":"IP range 192.168.0.0./16, reason: join flood."
   ]
}
```

CLOSE
-----

Close window.

```
{
   "id":"CLOSE",

    "window":1
}
```

CREATE
------

Create new window.

```JSON
{
   "id":"CREATE",

   "windowId":1,
   "width":476,
   "x":453,
   "newMsgs":2,
   "type":"group",
   "titlealert":0,
   "y":93,
   "password":"",
   "network":"MeetAndSpeak",
   "topic":"",
   "visible":1,
   "userMode":2,
   "height":178,
   "sounds":1,
   "chanName":"#testone"
}
```

```network``` can be ```MeetAndSpeak```, ```IRCNet```, ```FreeNode``` etc.

```type``` can be ```group``` or ```1on1```

DELNAME
-------

Remove a nick from window participant list.

```JSON
{
   "id":"DELNAME",

   "window":1,
   "nick":"ilkka"
}
```

FLIST
-----

Update information about the user's contacts (friends).

```JSON
{
   "id":"FLIST",

   "list":[
      {
         "idleTime":0,
         "name":"Ilkka Oksanen",
         "nick":"ilkka",
         "label":"|OK|"
      },
      {
         "idleTime":3464,
         "name":"Somebody Else",
         "nick":"else",
         "label":"|OK|"
      }
   ]
}
```

INFO
----

Show a generic info message.

```JSON
{
   "id":"INFO",

   "text":"You can't join group Secret. Wrong password."
}
```

INITDONE
--------

Initialization is complete.

```JSON
{
   "id":"INITDONE"
}
```

KEY
---

Update window password.

```
```

LOGS
----

Update Information about user log files.

```
```

NAMES
-----

Update window participant list.

```JSON
{
   "id":"NAMES"

   "names":[
      "ilkka",
      "neo",
      "morpheus",
   ],
   "window":"1",
}
```

NICK
----

Update user nick names in various networks.

```
```

OPERLIST
--------

Update window ban list.

```
```

REQF
----

Show a friend request.

```
```

SESSIONID
---------

Set session ID.

```JSON
{
   "id":"SESSIONID",

   "sessionId":856821,
}
```

SET
---

Update settings.

```JSON
{
   "id":"SET",

   "settings":{
      "largeFonts":"0",
      "showFriendBar":"1",
      "tz":"4",
      "firstTime":"0",
      "sslEnabled":"0",
      "loggingEnabled":"0"
   }
}
```

TOPIC
-----

Update window topic.

```
```

UPDATE
------

Update existing parameter for existing window.

```
```

MAS send request
================

In addition of listening commands from the server, the client can send commands to the server at any time after the initial MAS listen request.

```
HTTP POST /api/send/<sessionId>/<sendSeq>
```

**sessionId**: Must be set to value that the server returned with SESSIONID command.

**sendSeq**: Must be set to 0 in the first send request. Must be then increased by one after every received HTTP response from the server.

HTTP body contains the actual message in JSON. Following commands are supported.

SEND
----

```
{
  "command": "SEND"
  "windowId": 2,
  "text": "Hello world"
}
```

JOIN
----

CREATE
------

CLOSE
-----

RESIZE
------

MOVE
----

HIDE
----

REST
----

SEEN
----

SOUND
-----

TITLEALERT
----------

GETLOG
------

STARTCHAT
---------

LOGOUT
------

SET
---

ADDF
----

OKF
---

NOKF
----

TOPIC
-----

PW
--

WHOIS
-----

KICK
----

BAN
---

OP
--

GETOPERS
--------

DEOP
----

GETBANS
-------

UNBAN
-----

DELNTF
------

SETKEY
------

GETKEY
------

