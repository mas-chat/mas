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

local function getNicks(userId)
    local class = string.sub(userId, 1, 1)
    local nicks = {}
    local networks = redis.call('SMEMBERS', 'networklist')

    -- Special userIds
    if userId == 'iSERVER' then
        for i = 1, #networks do
            nicks[networks[i]] = 'IRC server'
        end
    elseif userId == 'mDEMO' then
        for i = 1, #networks do
            nicks[networks[i]] = 'John'
        end
    elseif class == 'm' then
        for i = 1, #networks do
            local networkNick = redis.call('HGET',
                'networks:' .. userId .. ':' .. networks[i], 'currentnick')

            if networkNick then
                nicks[networks[i]] = networkNick
            end
        end

        nicks['MAS'] = redis.call('HGET', 'user:' .. userId, 'nick')
    elseif class == 'i' then
        local networkNick = redis.call('HGET', 'ircuser:' .. userId, 'nick')

        for i = 1, #networks do
            nicks[networks[i]] = networkNick -- This is a shortcut, ircUserId is scoped by network
        end
    end

    return nicks
end

local function getName(userId)
    -- Special userIds
    if userId == 'iSERVER' then
        return 'IRC server'
    elseif userId == 'mDEMO' then
        return 'John Q. Random'
    end

    local class = string.sub(userId, 1, 1)

    if class == 'm' then
        return redis.call('HGET', 'user:' .. userId, 'name')
    elseif class == 'i' then
        -- It would be too expensive to ask everybodys name using IRC protocol
        return 'IRC User'
    end
end

local function getAvatarHash(userId)
    local class = string.sub(userId, 1, 1)

    if class == 'm' then
        return redis.call('HGET', 'user:' .. userId, 'emailMD5')
    else
        return ''
    end
end
