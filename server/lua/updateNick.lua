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

local userId = ARGV[1]
local network = ARGV[2]
local oldNick = string.lower(ARGV[3])
local newNick = string.lower(ARGV[4])

local masUserId = redis.call('HGET', 'index:currentnick', network .. ':' .. oldNick)

if masUserId then
    redis.call('HDEL', 'index:currentnick', network .. ':' .. oldNick)
    redis.call('HSET', 'networks:' .. masUserId .. ':' .. network, 'currentnick', newNick)
    redis.call('HSET', 'index:currentnick', network .. ':' .. newNick, masUserId)
    return masUserId
end

local ircUserId = redis.call('HGET', 'index:ircuser', network .. ':' .. oldNick)

if ircUserId then
    redis.call('HDEL', 'index:ircuser', network .. ':' .. oldNick)
    redis.call('HSET', 'ircuser:' .. ircUserId, 'nick', newNick)
    redis.call('HSET', 'index:ircuser', network .. ':' .. newNick, ircUserId)
    return ircUserId
end

return nil
