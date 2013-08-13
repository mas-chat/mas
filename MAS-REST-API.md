
MAS REST API
============

Work in progress.

Server Message descriptions
===========================

Messages that MAS server can send to a client. A message is always a
request for client to take some action.

ADDNAME
-------

Add a new nick to window participant list.

ADDNTF
------

Add a new sticky message to window.

ADDURL
------

Add a new UEL to window url list.

ADDTEXT
-------

Add a messge to window.

```
{
   "id":"ADDTEXT"

   "body":"Hello worlds!",
   "cat":"notice",
   "window":1,
   "ts":"209",
   "nick":"ilkka2",
   "type":0,
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
```

CREATE
------

Create new window.

```
{
   "id":"CREATE",

   "width":476,
   "window":1,
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

```
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

SET
---

Update settings.

```
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
