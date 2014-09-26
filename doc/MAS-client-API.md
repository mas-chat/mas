
MAS client API
==============

Version: 1

Work in progress.

Introduction
============

MAS protocol is message based, server driven and built on top of long polling. It is designed with WebSockets support in mind. WebSockets transport will be added when all browsers and mobile OSes have adequate support for it.

Overall approach is:

1. The client sends an **initial MAS listen HTTP POST request**
2. The server responds with N commands.
   - These commands allow the client to draw the initial UI view.
3. The client sends **MAS listen HTTP POST request**
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

All MAS listen and send requests must contain an authentication cookie. Cookie format is

```
Cookie: ProjectEvergreen=<userId>-<secToken>-n
```

**userId**: User ID (integer). Returned by the server after a successful login.

**secToken**: Security token (integer). Returned by the server after a successful login.

Session management
==================

The user is allowed to have multiple active connections to the server. A new session ID is generated after every initial MAS listen request. Client must include session ID to all HTTP requests after initial MAS listen HTTP GET request.

If the session ID becomes invalid because of long break between HTTP listen requests, the server will respond with the HTTP status code ```not acceptable```. In this case the client can initate new sesssion.

MAS listen request
==================

```
POST /api/v1/listen
Content-Type: application/json; charset=UTF-8
```
```JSON
{
    "seq":123,
    "sessionId":"YCkmphVXX3GmmJb"
}
```

| Parameter|Allowed in|Type|Description|
------------|-------------|----------|-------------|
| seq       | all         | mandatory| Sequence number, must be set to 0 in the initial listen request. Must be then increased by one after every succesfully received HTTP response from the server. Sequence numbers give protection against network errors. For example, consider a situation where the client sends listen request with seq 13. New chat message has arrived so the server responds with ADDTEXT command. From the server point of view, new chat message has now been delivered to the client. It is however possible that HTTP response gets lost in the network and client never receives it. In this case the client generated HTTP ajax request fails so the client doesn't increase sequence number. Then during the next round, server sees that the sequence number is still 13 and concludes that the client didn't receive its previous response. This triggers the server to resend the ADDTEXT command in addition to possible new commands. |
| sessionId  | all except first | mandatory | Mandatory in all requests, except in the initial listen request where it must not exist. SessionID must be set to value (string) that the server returned with SESSIONID command. |
| clientName | first | optional | Client name |
| clientOS   | first | optional | Client operating system |
| cachedUpto | first | optional | Every ADDTEXT command has a gid field which is ever increasing global id. This parameter communicates the highest the client has already seen and stored. The server will omit of sending messages with lower gid in the beginning of session. Without this option, the server sends up to 200 ADDTEXT messages for every window to fill the window backlog. |

Overal server response format to MAS listen request is:

```JSON
[
    {
         "id":"ADDTEXT",

         "body":"How are you?",
         "cat":"msg",
         "windowId":2,
         "ts":341,
         "userId":"m325324",
         "gid":48929534
    },
    {
         "id":"ADDTEXT",

         "body":"Good, thanks.",
         "cat":"notice",
         "windowId":2,
         "ts":348,
         "userId":"m423342",
         "gid":48929537
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
   "noteId":42,
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
   "userId":"m432454",
   "gid":823458234
}
```

```ts``` is a unix timestamp, seconds since epoch.

```cat``` can be ```msg```, ```info```, ```notice```, ```banner```, ```error```, ```mymsg```, ```mention```, ```action``` or ```robot```

```gid``` is a globally unique identifier (integer) for the message. Given two messages, a newer one has always larger gid. Gid can increase by more than one between subsequent messages inside a window.

BANLIST
-------

Update window ban list.

```JSON
{
   "id":"BANLIST",

   "window":1,
   "list":[{
      "banId":42,
      "info":"IP range 192.168.0.0./16, reason: join flood."
   }]
}
```

CLOSE
-----

Close window.

```JSON
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

```password``` null if password protection is disabled, a string otherwise

```userMode``` can be ```participant```, ```operator```, ```owner```

USERS
-----

Information about the other users. Server sends USERS command containing a userId before that userId is used in any other message.

```JSON
{
   "id":"USERS",

   "mapping":{
      "42":{
         nick:"neo"
      },
      "144":{
         nick:"morpheus"
      },
      "300":{
         nick:"trinity"
      }
   }
}
```

Server can send USERS command to update information that it sent in earlier USERS command. This happends for example when any user changes his nick.

FRIENDS
-------

Full list of user's contacts (friends).

```JSON
{
   "id":"FRIENDS",

   "friends":[
      {
         "userId":"m42321",
         "name":"Ilkka Oksanen",
         "online":true
      },
      {
         "userId":"m13323",
         "name":"Somebody Else",
         "online":false,
         "last":1411259620
      }
   ]
}
```

```online``` can be ```true```, ```false```. Indicates the current situation.

```last``` is included if ```online``` is ```false```. It's a unix timestamp indicating when this user was logged in last time. Also possible is a special value ```-1``` which means this user hasn't ever logged in.

FRIENDSUPDATE
-------------

An update to the initial list received with ```FRIENDS``` commands. Contains new information regarding one specific user.

```JSON
{
   "id":"FRIENDSUPDATE",

   "userId":"m13323",
   "online":false,
   "last":1411259620
}
```

Fields are same as in ```FRIENDS``` command.

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

LOGS
----

Update Information about user log files.

```
```

ADDMEMBERS
----------

Add or update nicknames in window participant list.

```JSON
{
   "id":"ADDMEMBERS"

   "windowId":1,
   "reset": true,
   "members":{
     "m42238": "@",
     "m13233": "u",
     "m32354": "+"
   }
}
```

If ```reset``` is true, then the existing list needs to be cleared. Otherwise the command adds new names to the existing list.

```members``` is an object presenting the changes. Keys are userIds of new users in this group/IRC channe or users whose status have changed. Value is either ```@``` if the user is an operator, ```+``` if the user has voice, and ```u``` if the user is a normal user.

DELMEMBERS
----------

Remove one or more users from window participant list.

```JSON
{
   "id":"DELMEMBERS",

   "windowId":1,
   "operators":[
     "ilkka"
   ],
   "members":[
     "m42238"
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

```JSON
{
   "id":"UPDATE",
   "windowId":1,

   "password":"newsecret"
}
```

Updates a value initially received in ```CREATE``` command.

Attributes in ```CREATE``` command that can be update are: ```password```.


MAS send request
================

In addition of listening commands from the server, the client can send commands to the server at any time after the initial MAS listen request.

```
POST /api/v1/send
```
```JSON
{
    "seq":12,
    "sessionId":"YCkmphVXX3GmmJb",
    "command": {
        "id": "SEND"
        "windowId": 2,
        "text": "Hello world"
    }
}
```

**sessionId**: Must be set to value that the server returned with SESSIONID command.

**seq**: Must be set to 0 in the first send request. Must be then increased by one after every received send request HTTP response from the server. See the sequence number description for listen request. In send request case the sequence number prevents command duplication. For example, the client sends SEND message and the server processes it. However the reponse gets lost in the network. On the client side this leads to failed ajax request. The client shall resend the command but with the same sequence number. The server notices the duplicate sequence number and just responds OK without actually proccessing the command second time. After that the client and server are in sync again.

**command**: One of the supported commands.

HTTP status codes:

```204``` OK (No content)

```401``` (Unauthorized) Unauthenticated. Same as listen request.

```406``` (Not Acceptable) Session expired. Same as listen request.

Response body is always empty.

Following commands are supported. Under every command is corresponding response.

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

REST
----

REST_RESP
---------

SEEN
----

SEEN_RESP
---------

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

End session immediately

```
{
  "id": "LOGOUT"
}
```

LOGOUT_RESP
-----------

```
{
  "id": "LOGOUT_RESP"
}
```

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

UPDATE_PASSWORD
---------------

```JSON
{
   "id":"UPDATE_PASSWORD"

   "windowId":1,
   "password": "pass123",
}
```

Password protection will be disabled if ```password``` is ```null```.

UPDATE_PASSWORD_RESP
--------------------

```JSON
{
   "id":"UPDATE_PASSWORD_RESP"
   "status": "OK"
}
```

Contains ```errorMsg``` property if the status is not ```OK```

UPDATE_TOPIC
------------

```JSON
{
   "id":"UPDATE_TOPIC"

   "windowId":1,
   "topic": "My new topic",
}
```

UPDATE_PASSWORD_RESP
--------------------

```JSON
{
   "id":"UPDATE_PASSWORD_RESP"
   "status": "OK"
}
```

Contains ```errorMsg``` property if the status is not ```OK```
