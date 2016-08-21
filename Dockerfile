MAINTAINER Ilkka Oksanen <iao@iki.fi>

FROM mhart/alpine-node

RUN apk add --no-cache make gcc g++ python icu-dev

ADD server client /app

WORKDIR /app/server

RUN npm install

WORKIR /app/server/website

RUN npm install && cd .. && npm run prod && rm -fr website/node_modules

WORKDIR /app/client

RUN npm install && ./node_modules/.bin/bower install && ./node_modules/.bin/ember build  && rm -fr node_modules bower_components

EXPOSE 3200

CMD ["npm", "run", "start-frontend"]
