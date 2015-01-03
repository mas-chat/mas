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

local function getNick(userId)
    local class = string.sub(userId, 1, 1)

    if class == 'm' then
        return redis.call('HGET', 'user:' .. userId, 'nick')
    elseif class == 'i' then
        return redis.call('HGET', 'ircuser:' .. userId, 'nick')
    end
end

local function getName(userId)
    local class = string.sub(userId, 1, 1)

    if class == 'm' then
        return redis.call('HGET', 'user:' .. userId, 'name')
    elseif class == 'i' then
        -- It would be too expensive to ask everybodys name using IRC protocol
        return 'IRC User'
    end
end
