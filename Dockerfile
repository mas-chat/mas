FROM node:8.8.0

RUN apt-get update
RUN apt-get install exiftran

ENV NPM_CONFIG_LOGLEVEL warn

MAINTAINER Ilkka Oksanen <iao@iki.fi>

COPY client /app/client/
WORKDIR /app/client/

RUN yarn install \
  && yarn run bower \
  && yarn run build  \
  && rm -fr node_modules bower_components tmp

COPY server /app/server/
WORKDIR /app/server/

RUN yarn install --production \
  && yarn run prod

RUN cd website \
  && yarn install \
  && yarn run prod \
  && rm -fr node_modules

COPY newclient /app/newclient/
WORKDIR /app/newclient

RUN yarn install \
  && yarn run prod \
  && rm -fr node_modules

WORKDIR /app/server/
