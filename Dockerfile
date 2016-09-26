FROM node:6

RUN apt-get update
RUN apt-get install exiftran

ENV NPM_CONFIG_LOGLEVEL warn

MAINTAINER Ilkka Oksanen <iao@iki.fi>

COPY client /app/client/
WORKDIR /app/client/
RUN npm install && npm run bower && npm run build  && rm -fr node_modules bower_components tmp

COPY server /app/server/
WORKDIR /app/server/
RUN npm install --production && npm run prod
RUN cd website && npm install && npm run prod && rm -fr node_modules

CMD ["npm", "run", "start-frontend"]
