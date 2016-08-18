FROM mhart/alpine-node

RUN apk add --no-cache make gcc g++ python icu-dev

RUN mkdir /app
COPY server/* /app/

WORKDIR /app

RUN npm install

EXPOSE 3200

CMD ["./node_modules/.bin/async-node", "server.js"]
