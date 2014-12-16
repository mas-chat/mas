
MAS Redis structures
====================

```
 user:<userId> (hash)
   name (string)
   email (string)
   inUse (string)
   lastlogout (int, unix time) (0 = online)
   passwd (string)
   salt (string)
   nick (string)
   token (string)
   cookie (string)
   cookie_expires (int, unix time)
   lastip (string)
   ads (int)
   maxwindows (int)
   openidurl (string)
   registrationtime (int, unix time)
   nextwindowid (int)

 sessionlist:<userId> (zset)
   sessionId1, timeStamp1, sessionId2, timeStamp2 ...

 session:<userId>:<sessionId> (hash)
   sendRcvNext (int)
   listenRcvNext (int)
   timeStamp (int)
   lastreply (string)

 sessionknownuserids:<userId>:<sessionId> set
   <userId1>, <userId2>, ...

 sessionlastrequest (zset)
   userId:sessionId1, timestamp1, userId:sessionId2, timestamp2 ...

 outbox:<userId>:<sessionId> (list) TBD: rename clientinbox!
   msg1, msg2

 index:user (hash)
   <email> (int, userId)
   <nick> (int, userId)
   <openidurl> (int, userId)

 users (set)
   <userId1>, <userId2> ...

 friends:<userId> (set)
   <userId1>, <userId2> ...

 settings:<userId> (hash)
   <name> (string)

 windowlist:<userId> (set)
   <windowId1>, <windowId2> ...

 networks:<userId>:<network> (hash)
   state (string, 'connected', 'connecting', 'disconnected')
   currentnick (text)
   retryCount (int)

 window:<userId>:<windowId> (hash)
   groupid (string)
   sounds (bool)
   titleAlert (bool)
   visible (bool)
   userMode (string)

 msgs:<groupId> (list) [oldest message on the right]

 group:<groupId> (hash)
   owner (int, userId) (mas only)
   network (string, 'mas or 'ircnet', 'freenode', 'w3c')
   type (string, 'group', or '1on1')
   name (string) [ #foo (irc), example (mas), i43342-m432343 (irc 1on1), m43123-m98643 (mas 1on1) ]
   topic (string)
   password (string)
   apikey (string)

 groupmembers:<groupId> (set)
   <userId1>, <userId2> ...

 names:<userId>:<windowId> (hash)
   <userId>: (string, '@', '+', 'u')
   ...

 notelist:<userId>:<nwid>:<channel_name> (set) TBD: Use windowId
   note1, note2 ...

 note:<uuid> (hash)
   ver (int)
   nick (string)
   timestamp (int)
   msg (text)

 urls:<userId>:<nwid>:<channel_name> (list) TBD: Use windowId
   url1, url2 ...

 passwordresettoken:<token> (string with expiry time)
   <userId>

 ircuserdb [TBD]

```

 Backends
 ========

```
 inbox:loopbackparser (list)
 inbox:ircparser (list)
 inbox:connectionmanager (list)
```

Global IDs
==========

```
 nextGlobalUserId (string) (integer, counter)
 nextGlobalNoteId (string) (integer, counter)
 nextGlobalMsgId (string) (integer, counter)
```
