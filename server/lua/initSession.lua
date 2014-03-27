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

-- Initialization of outbox needs to be atomic operation (=Lua script)
-- for streaming to be realiable.

local sessionId = ARGV[1]
local userId = ARGV[2]
local outbox = 'outbox:' .. userId .. ':' .. sessionId

local function split(s, delimiter)
    local result = {}
    for match in (s..delimiter):gmatch('(.-)'..delimiter) do
        table.insert(result, match)
    end
    return result
end

-- Redis HGETALL doesn't return a real hash, fix it.
local hgetall = function (key)
  local bulk = redis.call('HGETALL', key)
    local result = {}
    local nextkey
    for i, v in ipairs(bulk) do
        if i % 2 == 1 then
            nextkey = v
        else
            result[nextkey] = v
        end
    end
    return result
end

redis.call('LPUSH', outbox, cjson.encode({
    ['id'] = 'SESSIONID',
    ['sessionId'] = sessionId
}))

redis.call('LPUSH', outbox, cjson.encode({
    ['id'] = 'SET',
    ['settings'] = nil
}))

--Iterate through windows
local windows = redis.call('SMEMBERS', 'windowlist:' .. userId);

for i = 1, #windows do
    local windowId, network = unpack(split(windows[i], ':'))
    local window = hgetall('window:' .. userId .. ':' .. windowId);

    redis.call('LPUSH', outbox, cjson.encode({
        ['id'] = 'CREATE',
        ['windowId'] = tonumber(windowId),

        ['network'] = network,
        ['name'] = window.name,
        ['type'] = window.type,
        ['sounds'] = window.sounds == 'true',
        ['titleAlert'] = window.titleAlert == 'true',
        ['userMode'] = window.userMode,
        ['visible'] = window.visible == 'true',
        ['row'] = window.row,
        ['password'] = window.password,
        ['topic'] = window.topic
    }))

    local ops = redis.call('SMEMBERS', 'names:' .. userId .. ':' .. windowId .. ':ops')
    local users = redis.call('SMEMBERS', 'names:' .. userId .. ':' .. windowId .. ':users')
    local namesCommand = {
        ['id'] = 'ADDNAMES',
        ['windowId'] = tonumber(windowId),
        ['reset'] = true,
    }

    --Just because empty arrays are problematic, google 'lua cjson empty array'

    if #ops > 0 then
        namesCommand['operators'] = ops
    end

    if #users > 0 then
        namesCommand['users'] = users
    end

    redis.call('LPUSH', outbox, cjson.encode(namesCommand))

    local lines = redis.call('LRANGE', 'windowmsgs:' .. userId .. ':' .. windowId, 0, -1);

    for ii = #lines, 1, -1 do
        redis.call('LPUSH', outbox, lines[ii])
    end
end

redis.call('LPUSH', outbox, cjson.encode({
    ['id'] = 'INITDONE'
}))
