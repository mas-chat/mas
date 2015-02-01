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

#include 'userDb'

local function introduceNewUserIds(userId, sessionId, excludeSessionId, force, userIdList)
    local sessions

    if sessionId ~= nil then
        sessions = redis.call('ZRANGE', 'sessionlist:' .. userId, 0, -1)
    else
        sessions = { sessionId }
    end

    for i = 1, #sessions do
        if sessions[i] ~= excludeSessionId then
            local key = 'sessionknownuserids:' .. userId .. ':' .. sessions[i]
            local outbox = 'outbox:' .. userId .. ':' .. sessions[i]
            local newUsers = {}

            for ii = 1, #userIdList do
                local isKnown = redis.call('SISMEMBER', key, userIdList[ii])

                if isKnown == 0 or force == "true" then
                    -- This client session hasn't seen this userId yet
                    local newUserId = userIdList[ii]

                    newUsers[newUserId] = {
                        ['nick'] = getNicks(newUserId),
                        ['name'] = getName(newUserId),
                        ['gravatar'] = getAvatarHash(newUserId)
                    }
                end
            end

            if next(newUsers) ~= nil then
                -- Send USERS command as there are new userIds the client doesn't know about
                redis.call('RPUSH', outbox, cjson.encode({
                    ['id'] = 'USERS',
                    ['mapping'] = newUsers
                }))

                -- Mark these new userIds as known
                redis.call('SADD', key, unpack(userIdList))
            end
        end
    end
end
