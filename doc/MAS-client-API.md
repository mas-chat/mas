
# MAS client API

Protocol version: 1

Work in progress.

# Introduction

MAS protocol is message based, server driven and built on top of
[socket.io](http://socket.io/) version 1.x.

# Login

Login endpoint expects username and password in URL encoded form (like normal form submission).

```
POST /login

username=john&password=123456
```

Response:

```JSON
200 OK

{
    "success": true,
    "userId": "m453353",
    "secret": "O1BgcLMBBEFC2etpjsRo",
    "expires": 1420488608
}
```

UserId and secret and are needed to initiate a new client session. Expires property informs when the secret expires. The value is seconds since epoch.

# Session

The overall approach is:

1. The client calls socket.io connect() with default URL and port.

2. Immediately after connection the client emits 'init' event.

3. Server responds either with 'initok' or 'initfail' event. If the client receives 'initfail' it needs to login again to get a new secret.

4. After 'initok' the server emits N 'ntf' (notification) events. These notification messages allow the client to draw the initial UI. Event payload contains a JSON message which describes the notification type and other parameters.

5. When the client initiates an action it emits an 'req' (request) event. Event payload contains a JSON message which describes the request type and other parameters.

6. After processing the request, the server sends a 'resp' event. Event payload contains a JSON message which describes the response type and other parameters.

7. Eventually the socket.io socket is disconnected either by the client or server.

The user is allowed to have multiple concurrent active sessions (socket.io sockets) towards the server, e.g from different browser tabs or mobile devices.

# Socket.io events

List of used events.

| Socket.io event name | Originator |
|----------------------|------------|
| init                 | client     |
| initok               | server     |
| initfail             | server     |
| ntf                  | server     |
| req                  | client     |
| resp                 | server     |

## Init event payload

```JSON
{
    "userId": "m453353",
    "secret": "O1BgcLMBBEFC2etpjsRo",
    "clientName": "my_client_app",
    "clientOS": "android",
    "cachedUpto": 3763453
}
```

| Parameter  | Type      | Description                                        |
|------------|-----------|----------------------------------------------------|
| userId     | mandatory | User Id                                            |
| secret     | mandatory | Secret authentication token                        |
| clientName | optional  | Client name                                        |
| clientOS   | optional  | Client operating system                            |
| cachedUpto | optional  | Every ADDTEXT notification has a gid field which is ever increasing global id. This parameter communicates the highest the client has already seen and stored. The server will omit of sending messages with lower gid in the beginning of session. Without this option, the server sends up to 200 ADDTEXT notification for every window to fill the window backlog. |

## Initok event payload

```JSON
{
    "sessionId": "4F3rfdSW3Fd34"
}
```

| Parameter  | Type      | Description                                        |
|------------|-----------|----------------------------------------------------|
| sessionId  | mandatory | Session identifier. Needed for image uploads.      |

## Initfail event payload

```JSON
{
    "reason": "Invalid or expired secret."
}
```

| Parameter  | Type      | Description                                        |
|------------|-----------|----------------------------------------------------|
| reason     | mandatory | Textual description of the failure reason.         |

## Ntf, req, and resp event payload

```JSON
{
    "id": "ADDTEXT"
    ...
}
```

| Parameter  | Type      | Description                                        |
|------------|-----------|----------------------------------------------------|
| id         | mandatory | Type of the notification, request, or response     |

Other paramters are specific to notification, request, or response type. See below.

# Example scenario

John has two active clients (A and B). Both of the clients have established active sessions (A1 and B1).

John decides to join to 'copenhagen' chat group. He clicks the join group button in client A. As a result, through the session A1, the server receives a 'req' event which contains a 'JOIN' message. Server validates the request and sends 'CREATE' notification to all John's active sessions (A1 and B1). 'CREATE' notification instructs the clients to create new UI window or tab for the 'copenhagen' group. After that the server sends 'JOIN' response to session A1. Purpose of a response message is mainly to communicate failure reasons when requests can't be fulfilled.

All updates that trigger change in the UI are signalled similarly as notifications. With this approach all active clients stay synced in real time.

Another advantage is that client startup phase is not a special case. The server simply sends one 'CREATE' notification per every group the user is participating.

# Notifications

Below is the list of notifications that MAS server can send to a client.
A notification is always a request for the client to take some action.

### ADDNTF

Add a new sticky message to window.

```JSON
{
  "id": "ADDURL",

  "window": 1,
  "noteId": 42,
  "body": "Next meeting tomorrow at 4PM"
}
```

### ADDURL

Add a new url to window url list.

```JSON
{
  "id": "ADDURL",

  "window": 1,
  "url": "http://google.com"
}
```

### ADDTEXT

Add a messge to window.

```JSON
{
  "id": "ADDTEXT",

  "windowId": 1,
  "body": "Hello worlds!",
  "cat": "notice",
  "ts": "2093243",
  "userId": "m432454",
  "gid": 823458234
}
```

```ts``` is a unix timestamp, seconds since epoch.

```cat``` can be ```msg```, ```info```, ```notice```, ```banner```, ```error```, ```mymsg```, ```mention```, ```action``` or ```robot```

```gid``` is a globally unique identifier (integer) for the message. Given two messages, a newer one has always larger gid. Gid can increase by more than one between subsequent messages inside a window.

### BANLIST

Update window ban list.

```JSON
{
  "id": "BANLIST",

  "window": 1,
  "list": [{
    "banId": 42,
     "info": "IP range 192.168.0.0./16, reason: join flood."
  }]
}
```

### CLOSE

Close window.

```JSON
{
  "id": "CLOSE",

   "window": 1
}
```

### CREATE

Create new window. Window identifier is either ```userId``` or ```name```.

```JSON
{
  "id": "CREATE",

  "windowId": 1,
  "name": "testone",
  "userId": "m43544",
  "type": "group",
  "network": "MAS",
  "password": "",
  "titleAlert": false,
  "topic": "We meet tomorrow at 3PM",
  "visible": true,
  "role": "@",
  "sounds": true,
  "row": 3
}
```

```type``` can be ```group```, ```1on1```

```network``` can be ```MAS```, ```IRCNet```, ```FreeNode``` etc.

```password``` null if password protection is disabled, a string otherwise

```role``` can be ```u``` (participant), ```v``` (voice), ```@``` (operator), ```*``` (owner)

```name``` is an empty string if ```type``` is ```1on1```

```userId``` is null if ```type``` is ```group```

### USERS

Information about the other users. Server sends USERS command containing a userId before that userId is used in any other message.

```JSON
{
  "id": "USERS",

  "mapping": {
    "m42": {
      "nick": "neo"
    },
    "m144": {
      "nick": "morpheus"
    },
    "m300": {
      "nick": "trinity"
    }
  }
}
```

Server can send USERS command to update information that it sent in earlier USERS command. This happends for example when any user changes his nick.

### FRIENDS

Full list of user's contacts (friends).

```JSON
{
  "id": "FRIENDS",

  "friends": [{
      "userId": "m42321",
      "online": true
    }, {
      "userId": "m13323",
      "online": false,
      "last": 1411259620
    }
  ]
}
```

```online``` can be ```true```, ```false```. Indicates the current situation.

```last``` is included if ```online``` is ```false```. It's a unix timestamp indicating when this user was logged in last time. Also possible is a special value ```-1``` which means this user hasn't ever logged in.

### FRIENDSUPDATE

An update to the initial list received with ```FRIENDS``` commands. Contains new information regarding one specific user.

```JSON
{
  "id": "FRIENDSUPDATE",

  "userId": "m13323",
  "online": false,
  "last": 1411259620
}
```

Fields are same as in ```FRIENDS``` command.

### INFO

Show a generic info message.

```JSON
{
  "id": "INFO",

  "text": "You can't join group Secret. Wrong password."
}
```

### INITDONE

Initialization is complete. Hint that client can now render the UI as all initial messages (backlog) have arrived. Allows client to not update UI based on every received ADDTEXT command at session startup. Can lead to more responsive UI.

```JSON
{
  "id": "INITDONE"
}

```

### LOGS

Update Information about user log files.

```
TBD
```

### ADDMEMBERS

Add or update users in window participant list.

```JSON
{
  "id": "ADDMEMBERS",

  "windowId": 1,
  "reset": true,
  "members": [{
      "userId": "m42238",
      "role": "@"
    }, {
      "userId": "m13233",
      "role": "u"
    }, {
      "userId": "m32354",
      "role": "+"
    }
  ]
}
```

If ```reset``` is true, then the existing list needs to be cleared. Otherwise the command adds new users or updates existing users' roles on the list.

```role``` Value is either ```*``` if the user is the owner, ```@``` if the user is an operator, ```+``` if the user has voice, and ```u``` if the user is a normal user.

### DELMEMBERS

Remove one or more users from window participant list.

```JSON
{
  "id": "DELMEMBERS",

  "windowId": 1,
  "members": [{
      "userId": "m42238"
    }, {
      "userId": "m35345"
    }
  ]
}
```

### NICK

Update user nick names in various networks.

```
TBD
```

### OPERLIST

Update window ban list.

```
TBD
```

### REQF

Show a friend request.

```
TBD
```

### SET

Update settings.

```JSON
{
  "id": "SET",

  "settings": {
    "largeFonts": "0",
    "showFriendBar": "1",
    "firstTime": "0",
    "loggingEnabled": "0"
  }
}
```

### TOPIC

Update window topic. (TBD: merge with UPDATE)

```
TBD
```

### UPDATE

Update existing parameter for existing window.

```JSON
{
  "id": "UPDATE",
  "windowId": 1,

  "password": "newsecret"
}
```

Updates a value initially received in ```CREATE``` command.

Attributes in ```CREATE``` command that can be update are: ```password```.

# Requests and responses

In addition of listening notifications from the server, the client can send commands to the server at any time.

Following requests are supported. Under every request is corresponding response.

### SEND

```
{
  "id": "SEND",

  "windowId": 2,
  "text": "Hello world"
}
```

### SEND_RESP

### JOIN

Join to new MAS group or IRC channel

```
{
  "id": "JOIN",

  "name": "javascript",
  "network": "MAS",
  "password": ""
}
```

### JOIN_RESP

```
{
  "id": "JOIN_RESP",

  "status": "OK",
}
```

Contains ```errorMsg``` property if the status is not ```OK```

Status can be ```OK```, ```NOT_FOUND```, ```INCORRECT_PASSWORD```

### CREATE

Create new MAS group

```
{
  "id": "CREATE",

  "name": "javascript",
  "password": ""
}
```

### CREATE_RESP

### CLOSE

### CLOSE_RESP

### REST

### REST_RESP

### SEEN

### SEEN_RESP

### GETLOG

### GETLOG_RESP

### CHAT

```
{
  "id": 'CHAT',

  "windowId":: 8,
  "userId": "mr43432"
}
```

### CHAT_RESP

```
{
  "id": 'CHAT_RESP',

  "status": "OK"
}
```

or

```
{
  "id": 'CHAT_RESP',

  "status": "ERROR",
  "errorMsg": "You are already chatting with this person."
}
```

### LOGOUT

End session immediately

```
{
  "id": "LOGOUT"
}
```

### LOGOUT_RESP

```
{
  "id": "LOGOUT_RESP"
}
```

### SET

### SET_RESP

### ADDF

### ADDF_RESP

### OKF

### OKF_RESP

### NOKF

### NOKF_RESP

### UPDATE_PASSWORD

```JSON
{
  "id": "UPDATE_PASSWORD",

  "windowId": 1,
  "password": "pass123"
}
```

Password protection will be disabled if ```password``` is ```null```.

### UPDATE_PASSWORD_RESP

```JSON
{
  "id": "UPDATE_PASSWORD_RESP",

  "status": "OK"
}
```

Contains ```errorMsg``` property if the status is not ```OK```

### UPDATE_TOPIC

```JSON
{
  "id": "UPDATE_TOPIC",

  "windowId": 1,
  "topic": "My new topic"
}
```

### UPDATE_PASSWORD_RESP

```JSON
{
  "id": "UPDATE_PASSWORD_RESP",

  "status": "OK"
}
```

Contains ```errorMsg``` property if the status is not ```OK```
