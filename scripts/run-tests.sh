#!/usr/bin/env bash

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )

redis-server --port 44144 &
PID=$!

./server/server.js --configFile=test/mas-test.conf &
FE_PID=$!

casperjs test $ROOT/test/acceptance/*.js

kill $PID
wait $PID

kill $FE_PID
wait $FE_PID