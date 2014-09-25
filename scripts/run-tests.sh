#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )
RET_CODE=1
CASPER_RET_CODE=0

cd $ROOT

redis-server --port 44144 &
REDIS_PID=$!

echo "Waiting 1 second for the redis to start."
sleep 1

redis-cli -p 44144 flushall

./scripts/masctl -c start --configFile test/mas-test.conf

function finish {
    ./scripts/masctl -c stop --configFile test/mas-test.conf
    kill $REDIS_PID
    wait $REDIS_PID
    echo "Exit code: $RET_CODE"
    exit $RET_CODE
}

trap finish EXIT

echo "Waiting 3 seconds for the MAS processes to start and init."
sleep 3

# Verify that all servers are still running
./scripts/masctl status --configFile test/mas-test.conf

# OR part is needed because of set -e
casperjs test --engine=slimerjs --verbose $ROOT/test/integration/test-*.js || CASPER_RET_CODE=$?

# If all is good, return success in the finish trap
if [ $CASPER_RET_CODE == "0" ]; then
    RET_CODE=0
fi
