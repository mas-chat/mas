
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

 friends:<userId> (set)
   <userId1>, <userId2> ...

 settings:<userId> (hash)
   <name> (string)

 windowlist:<userId> (set)
   <windowId1>, <windowId2> ...

 window:<userId>:<windowId> (hash)
   collectionId (string)
   sounds (bool)
   titleAlert (bool)
   visible (bool)
   row (int)

 networks:<userId>:<network> (hash)
   state (string, 'connected', 'connecting', 'disconnected')
   currentnick (text)
   retryCount (int)

 collection:<collectionId> (hash)
   owner (string, userId) (mas group only)
   type (string, 'group', '1on1')
   name (string) (e.g. '#foo', 'bar') ('' if not group)
   network (string, 'mas or 'ircnet', 'freenode', 'w3c')
   topic (string)
   password (string)
   apikey (string)

 collectionmembers:<collectionId> (hash)
   <userId>: (string, '*' (owner) '@', (op) '+' (voice), 'u' (user))
   ...

 collectionmsgs:<collectionId> (list) [oldest message on the right]

 notelist:<collectionId> (list)
   note1, note2 ...

 note:<uuid> (hash)
   ver (int)
   nick (string)
   timestamp (int)
   msg (text)

 urls:<collectionId> (list)
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
 nextGlobalCollectionId (string) (integer, counter)
```
