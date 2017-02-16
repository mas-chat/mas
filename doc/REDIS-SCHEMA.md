
MAS Redis structures
====================

All persistent data is stored to rigidDB (which uses Redis as a storage backend).

The following temporary data is stored directly to Redis.

## Frontend server

```
 key:   1on1conversationhistory:<userId> (TODO: migrate to rigiddb soon)
 type:  list
 value: conversationId1, conversationId2, ...

 key:   passwordresettoken:<token>
 type:  string, with expiry time)
 value: userId

 key:   emailconfirmationtoken:<token>
 type:  string, with expiry time
 value: userId
```

## IRC backend server

```
 key:   namesbuffer:<userId>:<conversationId>
 type:  hash, with expiry time 1 min
 value: nicknameX, nicknameY, ...

 key:   ircnamesreporter:<conversationId>
 type:  string, with expiry time
 value: userId

 key:   ircduplicates:<conversationId>:<msgBody>:<userGid>
 type:  string, with expiry time
 value: userId
```
