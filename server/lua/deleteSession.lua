--
--   Copyright 2014 Ilkka Oksanen <iao@iki.fi>
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
local sessionId = ARGV[2]

-- Remove notification queue
redis.call('DEL', 'outbox:' .. userId .. ':' .. sessionId)

-- Remove sessionknownuserids
redis.call('DEL', 'sessionknownuserids:' .. userId .. ':' .. sessionId)

-- Remove sessionlastheartbeat entry
redis.call('ZREM', 'sessionlastheartbeat', userId .. ':' .. sessionId)

-- Remove from sessionlist
redis.call('ZREM', 'sessionlist:' .. userId, sessionId)

local sessions = tonumber(redis.call('ZCARD', 'sessionlist:' .. userId))

if sessions == 0 then
    return true
else
    return false
end

