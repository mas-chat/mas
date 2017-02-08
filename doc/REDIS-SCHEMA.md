
MAS Redis structures
====================

Most of data is stored to rigidDB. These are the raw redis data structures MAS uses.

```
 1on1conversationhistory:<userId> (list)
   <conversationId1>, <conversationId2>

 passwordresettoken:<token> (string with expiry time)
   <userId>

 emailconfirmationtoken:<token> (string with expiry time)
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

 emailnotifications (set)
   <userId1>, <userId2> ...

 emailnotificationslist:<userId> (list)
   <ntfId1>, <ntfId2>, ...

 emailnotification:<ntfId> (hash)
   type
   senderName
   senderNick
   groupName
   message
```

## IRC backend

```
 inbox:ircparser (list)

 inbox:connectionmanager (list)

 namesbuffer:<userId>:<conversationId> (hash, expiry 1 min)
   name1, name2 ...

 ircnamesreporter:<conversationId> (string with expiry time, userId)

 ircchannelsubscriptions:<userId>:<network> (hash)
   <channelName> (string, password)
```

## Loopback backend

```
 inbox:loopbackparser (list)
```

## Global IDs

```
 nextGlobalNoteId (string) (integer, counter)
 nextGlobalAnnouncementId (string) (integer, counter)
```


