#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )

cd $ROOT

redis-server --port 44144 &
PID=$!

echo "Waiting 1 second for the redis to start."
sleep 1

nohup node --harmony ./server/server.js --configFile=test/mas-test.conf > server.log 2> server_error.log&
FE_PID=$!

trap "kill -9 $PID; kill -9 $FE_PID" EXIT

echo "Waiting 1 second for the front-end server to start."
sleep 1

cat server.log

casperjs test --engine=slimerjs --verbose $ROOT/test/acceptance/test-*.js
