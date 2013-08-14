
MAS REST API
============

Work in progress.

MAS protocol is server driven. Overall approach is:

1. The client sends a HTTP GET / to server
2. The server responds with N messages
   - If the server doesn't have anything to send, HTTP connection is
     blocked up to 30 seconds. If 30 seconds is reached, the server
     closes the connection and responds with status "OK" and empty commands list.
3. The client builds or updates the UI by processing all the messages (if any)
4. The client immediately goes back to step 1.
   - In case of any XHR error, client SHALL wait some seconds and go to step 1.

Overal server response format is:

```JSON
{
   "status":"OK",
   "commands":[
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
}
```

When the user a triggers an action, e.g. wants to join a new channel,
client creates a second HTTP connection to send a message. Server
responds to this message immedetially.

-DETAILS TO BE ADDED-

Client Message descriptions
===========================

Messages that MAS client can sent to a server.

-TO BE ADDED-

Server Message descriptions
===========================

Messages that MAS server can send to a client. A message is always a
request for client to take some action.

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

```
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

   "window":1,
   "width":476,
   "x":453,
   "newMsgs":2,
   "chanType":0,
   "titlealert":0,
   "y":93,
   "password":"",
   "nwId":0,
   "topic":"",
   "visible":1,
   "userMode":2,
   "height":178,
   "sounds":1,
   "nwName":"MeetAndSpeak",
   "chanName":"#testone"
}
```

DELNAME
-------

Remove a nick from window participant list.

```
```

FLIST
-----

Update information about the user's contacts (friends).

```
```

INFO
----

Show a generic info message.

```
```

INITDONE
--------

Initialization is complete.

```
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
