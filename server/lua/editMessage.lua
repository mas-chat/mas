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

-- Initialization of notification queue needs to be atomic operation (=Lua script)
-- for streaming to be reliable.

local conversationId = ARGV[1]
local gid = tonumber(ARGV[2])
local userId = ARGV[3]
local text = ARGV[4]

local key = 'conversationmsgs:' .. conversationId
local lines = redis.call('LRANGE', key, 0, -1)

local message = nil
local index

for i = #lines, 1, -1 do
    local candidate = cjson.decode(lines[i])

    if candidate.gid == gid then
        message = candidate
        index = i - 1 -- Lua starts from 1, Redis from 0
        break
    end
end

if message == nil then
    return nil
end

if message.userId ~= userId then
    return nil
end

message.body = text
message.editTs = tonumber(redis.call('GET', 'nextGlobalMsgId'))

if text == "" then
    message.status = "deleted"
else
    message.status = "edited"
end

local messageString = cjson.encode(message)

redis.call('LSET', key, index, messageString)

return messageString
