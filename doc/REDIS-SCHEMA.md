
MAS Redis structures
====================

```
 user:<userId> (hash)
   name (string)
   email (string)
   inuse (string, 'true', 'false')
   lastlogout (int, unix time) (0 = online)
   password (string)
   nick (string)
   secret (string)
   secretExpires (int, unix time)
   lastip (string)
   maxwindows (int)
   openidurl (string)
   registrationtime (int, unix time)
   nextwindowid (int)

 userlist (set)
   <userId1>, <userId2> ...

 sessionlist:<userId> (zset)
   sessionId1, timeStamp1, sessionId2, timeStamp2 ...

 sessionknownuserids:<userId>:<sessionId> set
   <userId1>, <userId2>, ...

 sessionlastheartbeat (zset)
   userId:sessionId1, timestamp1, userId:sessionId2, timestamp2 ...

 outbox:<userId>:<sessionId> (list)
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
   conversationId (string)
   sounds (bool)
   titleAlert (bool)
   visible (bool)
   minimizedNamesList (bool)
   desktop (int)
   row (int)
   column (int)
   group (int)

 index:windowIds (hash)
   <userId>:<conversationId> (int, windowId)

 networks:<userId>:<network> (hash)
   state (string) (e.g. 'connected', 'connecting', 'disconnected')
   currentnick (text)
   retryCount (int)

 networklist (set)
   <network1>, <network2> ...

 index:currentnick (hash)
   <network>:<nick> (string, userId)

 conversation:<conversationId> (hash)
   owner (string, userId) (mas group only)
   type (string, 'group', '1on1')
   name (string) (e.g. '#foo', 'bar'. '' if not group)
   network (string) (e.g 'MAS' or 'IRCNet', 'FreeNode', 'W3C')
   topic (string)
   password (string)
   apikey (string)

 index:conversation (hash)
   group:<network>:<name> (int, conversationId)
   1on1:<network>:<userId1>:<userId2> (int, conversationId)

 1on1conversationhistory:<userId> (list)
   <conversationId1>, <conversationId2>

 conversationmembers:<conversationId> (hash)
   <userId>: (string, '*' (owner) '@', (op) '+' (voice), 'u' (user), 'd' (detached, only for MAS 1on1s))
   ...

 conversationlist:<userId> (set)
   <conversationId1>, <conversationId2>, ...

 conversationmsgs:<conversationId> (list) [oldest message on the right]

 passwordresettoken:<token> (string with expiry time)
   <userId>

 alert:<id> (hash)
   message (text)
   expires (unix time)
   dismissible (bool)
   report (bool)

 alertlist (set)
   <id1>, <id2> ...

 activealerts:<userId> (set)
   <id3>, <id4> ...

```

 IRC backend
 ===========

```
 inbox:ircparser (list)

 inbox:connectionmanager (list)

 ircuser:<userId>
   nick (string)
   nickMD5 (string)
   network (string)

 index:ircuser (hash)
   <network>:<nick> (string, userId)

 namesbuffer:<userId>:<conversationId> (hash, expiry 1 min)
   name1, name2 ...

 ircnamesreporter:<conversationId> (string with expiry time, userId)

 ircchannelsubscriptions:<userId>:<network> (hash)
   <channelName> (string, password)

```

 Loopback backend
 ================

```
 inbox:loopbackparser (list)
```

Global IDs
==========

```
 nextGlobalUserId (string) (integer, counter)
 nextGlobalNoteId (string) (integer, counter)
 nextGlobalMsgId (string) (integer, counter)
 nextGlobalConversationId (string) (integer, counter)
 nextGlobalAnnouncementId (string) (integer, counter)
```
