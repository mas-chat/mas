MAS Redis structures
====================

 user:<userid> (hash)
   name (string)
   email (string)
   inUse (string)
   lastlogin (int)
   passwd (string)
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

 sessionlist:<userid> (set)
   sessionId1, sessionId2 ...

 session:<userid>:<sessionId> (hash)
   sendRcvNext (int)
   listenRcvNext (int)
   timeStamp (int)

 outbox:<userid>:<sessionId> (list)
   msg1, msg2

 index:user (hash)
   <email> (int, userId)
   <nick> (int, userId)

 users (set)
   userid1, userid2 ...

 friends:<userid> (set)
   userID1, userId2 ...

 settings:<userid> (hash)
   nameXYZ (string)

 windowlist:<userid> (set)
   id:network:name

 window:<userid>:<id> (hash)
   name (string)
   x (int)
   y (int)
   width (int)
   height (int)
   type (int)
   sound (int)
   password (string)
   titlealert (int)
   hidden (int)

 windowmsgs:<userid>:<id> (list) [oldest message on the right]

 [TBD] names:<userid>:<id> (set)
   nick1, @nick2

 [TBD] inbox:<userid> (list)
   msg:<windowid>
   names:<windowid>

 notelist:<userid>:<nwid>:<channel_name> (set)
   note1, note2 ...

 note:<uuid> (hash)
   ver (int)
   nick (string)
   timestamp (int)
   msg (text)

 urls:<userid>:<nwid>:<channel_name> (list)
   url1, url2 ...


 outbox:nnn (list) TBD: rename clientinbox!
   msg1, msg2 ...


 IRC adapter
 ===========

 parserinbox (list)
 connectionmanagerinbox (list)
