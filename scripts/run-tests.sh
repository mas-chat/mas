#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )

redis-server --port 44144 &
PID=$!

sleep 1

nohup node --harmony ./server/server.js --configFile=test/mas-test.conf > server.log &
FE_PID=$!

echo "Waiting 1 second for the servers to start."
sleep 1

casperjs test $ROOT/test/acceptance/test-*.js

kill -9 $PID
kill -9 $FE_PID
