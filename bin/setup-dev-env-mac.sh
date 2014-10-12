#!/usr/bin/env bash

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )
REDIS_PORT=6379

cd $ROOT

echo 'Making sure Redis is running...'
redis-server ./conf/redis.conf --port $REDIS_PORT

sudo sysctl -w kern.maxfiles=50000
sudo sysctl -w kern.maxfilesperproc=50000
sudo sysctl -w kern.ipc.somaxconn=50000

ulimit -S -n 50000

killall ircd

ircd
