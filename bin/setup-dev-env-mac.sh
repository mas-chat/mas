#!/usr/bin/env bash

echo 'Making sure Redis is running...'
redis-server ./conf/redis.conf --port $REDIS_PORT

sudo sysctl -w kern.maxfiles=50000
sudo sysctl -w kern.maxfilesperproc=50000
sudo sysctl -w kern.ipc.somaxconn=50000

ulimit -S -n 50000

ircd
