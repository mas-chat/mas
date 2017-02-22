#!/usr/bin/env bash

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && cd .. && pwd )

cd $ROOT

echo 'Making sure Elasticsearch is running...'
elasticsearch -d

sudo sysctl -w kern.maxfiles=50000
sudo sysctl -w kern.maxfilesperproc=50000
sudo sysctl -w kern.ipc.somaxconn=50000

ulimit -S -n 50000

killall ircd

ircd
