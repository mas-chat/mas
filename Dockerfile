FROM node:7.6.0

RUN apt-get update
RUN apt-get install exiftran

ENV NPM_CONFIG_LOGLEVEL warn

MAINTAINER Ilkka Oksanen <iao@iki.fi>

RUN curl -o- -L https://yarnpkg.com/install.sh | bash -s -- --version 0.21.3

COPY client /app/client/
WORKDIR /app/client/

RUN /root/.yarn/bin/yarn \
  && /root/.yarn/bin/yarn run bower \
  && /root/.yarn/bin/yarn run build  \
  && rm -fr node_modules bower_components tmp

COPY server /app/server/
WORKDIR /app/server/

RUN /root/.yarn/bin/yarn --production \
  && /root/.yarn/bin/yarn run prod

RUN cd website \
  && /root/.yarn/bin/yarn \
  && /root/.yarn/bin/yarn run prod \
  && rm -fr node_modules

COPY newclient /app/newclient/
WORKDIR /app/newclient

RUN /root/.yarn/bin/yarn \
  && /root/.yarn/bin/yarn run prod \
  && rm -fr node_modules

WORKDIR /app/server/
CMD ["npm", "run", "start-frontend"]
