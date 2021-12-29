FROM node:17.3

ARG REVISION=unknown

RUN apt-get update && apt-get install -y \
  exiftran \
  && rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_LOGLEVEL warn
ENV PROJECT_ROOT /app/

COPY server /app/server/
WORKDIR /app/server/

RUN yarn install \
  && yarn run prod \
  && yarn cache clean

COPY website /app/website/
WORKDIR /app/website/

RUN yarn install \
  && yarn run build-prod \
  && rm -fr node_modules \
  && yarn cache clean

COPY client /app/client/
WORKDIR /app/client/

RUN yarn install \
  && yarn run build  \
  && rm -fr node_modules tmp \
  && yarn cache clean

COPY new-client /app/new-client/
WORKDIR /app/new-client/

RUN yarn install \
  && yarn run prod  \
  && rm -fr node_modules \
  && yarn cache clean

RUN echo -n $REVISION > /app/server/REVISION

WORKDIR /app/server/
