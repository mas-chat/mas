FROM node:9.9.0-alpine

RUN apk update && apk add python g++ make libc6-compat fbida-exiftran git && rm -rf /var/cache/apk/*

ENV NPM_CONFIG_LOGLEVEL warn

MAINTAINER Ilkka Oksanen <iao@iki.fi>

COPY client /app/client/
WORKDIR /app/client/

RUN yarn install \
  && yarn run bower \
  && yarn run build  \
  && rm -fr node_modules bower_components tmp \
  && yarn cache clean

COPY server /app/server/
WORKDIR /app/server/

RUN yarn install --production \
  && yarn run prod \
  && yarn cache clean

RUN cd website \
  && yarn install \
  && yarn run prod \
  && rm -fr node_modules \
  && yarn cache clean

COPY newclient /app/newclient/
WORKDIR /app/newclient

RUN yarn install \
  && yarn run prod \
  && rm -fr node_modules \
  && yarn cache clean

WORKDIR /app/server/
