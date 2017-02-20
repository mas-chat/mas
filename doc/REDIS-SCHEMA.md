
MAS Redis structures
====================

All persistent data is stored to rigidDB (which uses Redis as a storage backend).

The following temporary data is stored directly to Redis.

## Frontend server

```
 key:     passwordresettoken:<token>
 type:    string
 expires: 24 hours
 value:   <userId>

 key:     emailconfirmationtoken:<token>
 type:    string
 expires: 24 hours
 value:   <userId>
```

## IRC backend server

```
 key:     namesbuffer:<userId>:<conversationId>
 type:    hash
 expires: 1 minute
 value:   <nicknameX>, <nicknameY>, ...

 key:     ircnamesreporter:<conversationId>
 type:    string
 expires: 15 seconds
 value:   <userId>

 key:     ircduplicates:<conversationId>:<msgBody>:<userGid>
 type:    string
 expires: 45 seconds
 value:   <userId>

 key:     nickchangemutex:<network>:<oldNick>:<newNick>
 type:    string
 expires: 20 seconds
 value:   "1"
```
