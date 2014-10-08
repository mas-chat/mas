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

./bin/masctl -b -c start --configFile test/mas-test.conf

function finish {
    ./bin/masctl -c stop --configFile test/mas-test.conf
    kill $REDIS_PID
    wait $REDIS_PID
    echo "Exit code: $RET_CODE"
    exit $RET_CODE
}

trap finish EXIT

#Can't use this because slimerjs exit code is always 0, even in failure case
#casperjs test --engine=slimerjs --verbose $ROOT/test/integration/test-*.js && RET_CODE=$? || RET_CODE=$?

RET_CODE=0

echo "Running Casper. Can take long time..."

while read i; do
    echo $i

    if [[ $i == *FAIL* ]]; then
        RET_CODE=1
    fi
done < <(casperjs test --engine=slimerjs --verbose $ROOT/test/integration/test-*.js | sed 1d)

echo "Casper exit code: $RET_CODE"
