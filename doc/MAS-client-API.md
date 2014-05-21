
MAS client API
==============

Version: 1

Work in progress.

Introduction
============

MAS protocol is message based, server driven and built on top of long polling. It is designed with WebSockets support in mind. WebSockets transport will be added when all browsers and mobile OSes have adequate support for it.

Overall approach is:

1. The client sends an **initial MAS listen HTTP GET request**
2. The server responds with N commands.
   - These commands allow the client to draw the initial UI view.
3. The client sends **MAS listen HTTP GET request**
   - If the server doesn't have anything to send (e.g. no new messages), HTTP connection is blocked up to 30 seconds. If 30 seconds is reached and there is still nothing to send, the server
     closes the connection and responds with an empty commands list.
4. The client builds or updates the UI by processing all the commands (if any)
5. The client immediately goes back to step 3.
   - In case of any transport errors, client SHALL wait few seconds before proceeding.

When the user triggers an action, for example to join a new channel,
the client creates a second HTTP connection and sends **MAS send request** containing the command(s). Server responds to this request immediately with an empty HTTP body. After processing the command(s), server uses the active MAS listen request (long polling connection) to send a corresponding response message.

For example, the user wants to join a new channel and sends JOIN command. The server responds with HTTP 200 OK and closes the HTTP connection. The server then processes the join command and sends JOIN_RESP as a reply to the active MAS listen HTTP GET request.

Authentication
==============

All MAS listen and send requests must contain an authentication cookie. Cookie format is ...

Session management
==================

The user is allowed to have multiple active connections to the server. A new session ID is generated after every initial MAS listen request. Client must include session ID to all HTTP requests after initial MAS listen HTTP GET request.

If the session ID becomes invalid because of long break between HTTP listen requests, the server will respond with the HTTP status code ```not acceptable```. In this case the client can initate new sesssion.

MAS listen request
==================

```HTTP GET /api/v1/listen/<sessionId>/<listenSeq>/[timezone]```

**sessionId**: Must be set to 0 in the initial listen request. In all other requests sessionID must be set to value that the server returned with SESSIONID command.

**listenSeq**: Must be set to 0 in the initial listen request. Must be then increased by one after every received HTTP response to listen request from the server.

**timezone**: Optional. Can set to update user's current timezone in the first listen
request. For example ```120``` if the user is in Helsinki (+2:00 GMT)

Overal server response format to MAS listen request is:

```JSON
[
    {
        "id":"ADDTEXT"
         "body":"How are you?",
         "cat":"msg",
         "windowId":2,
         "ts":341,
         "nick":"neo",
         "type":1,
    },
    {
         "id":"ADDTEXT"
         "body":"Good, thanks.",
         "cat":"notice",
         "windowId":2,
         "ts":348,
         "nick":"morpheus",
         "type":1,
    },

    ...

]
```

HTTP status codes:

```200``` OK

```401``` (Unauthorized) Unauthenticated. New login needed to update the values in the cookie.

```406``` (Not Acceptable) Session expired. Send the initial MAS listen HTTP GET request to open new session.

```429``` (Too Many Requests) Too many open sessions. Currently the limit is 8 sessions. Close one of the existing ones before sending the initial MAS listen HTTP GET request again.

An active session is currently deleted after six hours of idle time.

Below is the list of commands that MAS server can send to a client.
A command is always request for the client to take some action.

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

   "windowId":1,
   "body":"Hello worlds!",
   "cat":"notice",
   "ts":"2093243",
   "nick":"ilkka2",
   "type":0
}
```

```ts``` is unix timestamp, seconds since epoch.

```cat``` can be ```msg```, ```info```, ```notice```, ```banner```, ```error```, ```mymsg```, ```mention```, ```action``` or ```robot```

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
   "name":"testone",
   "type":"group",
   "network":"MAS",
   "password":"",
   "titleAlert":false,
   "topic":"We meet tomorrow at 3PM",
   "visible":true,
   "userMode":"participant",
   "sounds":true
}
```

```type``` can be ```group```, ```1on1```

```network``` can be ```MAS```, ```IRCNet```, ```FreeNode``` etc.

```userMode``` can be ```participant```, ```operator```, ```owner```

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

Initialization is complete. Hint that client can now render the UI as all initial messages (backlog) have arrived. Allows client to not update UI based on every received ADDTEXT command at session startup. Can lead to more responsive UI.

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

ADDNAMES
--------

Add nicks to window participant list.

```JSON
{
   "id":"ADDNAMES"

   "windowId":1,
   "reset": true,
   "operators":[
     "ilkka",
     "neo",
     "morpheus",
   ],
   "users":[
     "trinity",
     "mranderson"
   ]
}
```

If ```reset``` is true, then the existing list needs to be cleared. Otherwise the command adds new names to the existing list.

```operators``` key will not be added to the command if there are no operators to add.

```users``` key is will not be added to the command if there are no users to add.

DELNAMES
--------

Remove nicks from window participant list.

```JSON
{
   "id":"DELNAMES",

   "windowId":1,
   "operators":[
     "ilkka"
   ],
   "users":[
     "trinity"
   ]
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
HTTP POST /api/v1/send/<sessionId>/<sendSeq>
```

**sessionId**: Must be set to value that the server returned with SESSIONID command.

**sendSeq**: Must be set to 0 in the first send request. Must be then increased by one after every received HTTP response from the server.

HTTP body contains the actual message in JSON. Following commands are supported. Under every command is corresponding response.

SEND
----

```
{
  "id": "SEND"
  "windowId": 2,
  "text": "Hello world"
}
```

SEND_RESP
---------

JOIN
----

Join to new MAS group or IRC channel

```
{
  "id": "JOIN"
  "name": "javascript",
  "network": "MAS",
  "password": ""
}
```

JOIN_RESP
---------

CREATE
------

Create new MAS group

```
{
  "id": "CREATE"
  "name": "javascript",
  "password": ""
}
```

CREATE_RESP
-----------

CLOSE
-----

CLOSE_RESP
----------

MOVE
----

MOVE_RESP
---------

HIDE
----

HIDE_RESP
---------

REST
----

REST_RESP
---------

SEEN
----

SEEN_RESP
---------

SOUND
-----

SOUND_RESP
----------

TITLEALERT
----------

TITLEALERT_RESP
---------------

GETLOG
------

GETLOG_RESP
-----------

STARTCHAT
---------

STARTCHAT_RESP
--------------

LOGOUT
------

LOGOUT_RESP
-----------

SET
---

SET_RESP
--------

ADDF
----

ADDF_RESP
---------

OKF
---

OKF_RESP
--------

NOKF
----

NOKF_RESP
---------

TOPIC
-----

TOPIC_RESP
----------

PW
--

PW_RESP
-------

WHOIS
-----

WHOIS_RESP
----------

KICK
----

KICK_RESP
---------

BAN
---

BAN_RESP
--------

OP
--

OP_RESP
-------

GETOPERS
--------

GETOPERS_RESP
-------------

DEOP
----

DEOP_RESP
---------

GETBANS
-------

GETBANS_RESP
------------

UNBAN
-----

UNBAN_RESP
----------

DELNTF
------

DELNTF_RESP
-----------

SETKEY
------

SETKEY_RESP
-----------

GETKEY
------

GETKEY_RESP
-----------
