--
--   Copyright 2015 Ilkka Oksanen <iao@iki.fi>
--
--   Licensed under the Apache License, Version 2.0 (the "License");
--   you may not use this file except in compliance with the License.
--   You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
--   Unless required by applicable law or agreed to in writing,
--   software distributed under the License is distributed on an "AS
--   IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
--   express or implied.  See the License for the specific language
--   governing permissions and limitations under the License.
--

local nick = string.lower(ARGV[1])
local network = ARGV[2]

local indexField = network .. ':' .. nick

local userId = redis.call('HGET', 'index:ircuser', indexField)

if not userId then
    userId = 'i' .. redis.call('INCR', 'nextGlobalIrcUserId')

    redis.call('HMSET', 'ircuser:' .. userId, 'nick', nick, 'network', network)
    redis.call('HSET', 'index:ircuser', indexField, userId)
end

return userId
