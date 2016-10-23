FROM node:6.9.1

RUN apt-get update
RUN apt-get install exiftran

ENV NPM_CONFIG_LOGLEVEL warn

MAINTAINER Ilkka Oksanen <iao@iki.fi>

RUN curl -o- -L https://yarnpkg.com/install.sh | bash

COPY client /app/client/
WORKDIR /app/client/
RUN /root/.yarn/bin/yarn && npm run bower && npm run build  && rm -fr node_modules bower_components tmp

COPY server /app/server/
WORKDIR /app/server/
RUN /root/.yarn/bin/yarn --production && npm run prod
RUN cd website && /root/.yarn/bin/yarn && npm run prod && rm -fr node_modules

CMD ["npm", "run", "start-frontend"]
