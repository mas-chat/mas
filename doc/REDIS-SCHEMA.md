
MAS Redis structures
====================

All persistent data is stored to rigidDB (which uses Redis as a storage backend).

The following temporary data is stored directly to Redis.

## Frontend server

```
 key:     frontend:password_reset_token:<token>
 type:    string
 expires: 24 hours
 value:   <userId>

 key:     frontend:email_confirmation_token:<token>
 type:    string
 expires: 24 hours
 value:   <userId>
```

## IRC backend server

```
 key:     irc:names_buffer:<userId>:<conversationId>
 type:    hash
 expires: 1 minute
 value:   <nicknameX>, <nicknameY>, ...

 key:     irc:names_reporter:<conversationId>
 type:    string
 expires: 15 seconds
 value:   <userId>

 key:     irc:duplicates_check:<conversationId>:<msgBody>:<userGid>
 type:    string
 expires: 45 seconds
 value:   <userId>

 key:     irc:nick_changed_mutex:<network>:<oldNick>:<newNick>
 type:    string
 expires: 20 seconds
 value:   "1"
```
