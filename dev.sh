#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && pwd )

export PROJECT_ROOT=$ROOT

cd $ROOT

case "$1" in
    s|start)
        clear
        cd server
        yarn run --silent dev
        ;;

    b|build)
        set -x
        cd client
        yarn
        yarn run build-dev
        cd ../server
        yarn
        yarn run prod
        cd ../website
        yarn
        yarn run prod
        set +x
        echo "Install done."
        ;;

    c|clean)
        set -x
        rm -fr client/node_modules client/tmp client/dist
        rm -fr server/node_modules
        rm -fr website/node_modules website-dist
        rm -fr server/emails/build
        rm -fr server/test/browser/node_modules
        find . -name npm-debug.log | xargs rm
        set +x
        echo "Clean done."
        ;;

    resetdb)
        echo -n "!!! Are you absolutely sure this is a development environment? [yes/NO] "
        read ANSWER
        if [ "$ANSWER" = "yes" ]; then
            mkdir -p tmp
            redis-server --daemonize yes --dir tmp/
            redis-cli FLUSHALL
            ./server/bin/create-db
            redis-cli SHUTDOWN SAVE
            echo "Redis reset done."
        else
            echo "Cancelled."
        fi
        ;;
    *)
        echo $"Usage: $0 {start|build|clean|resetdb}"
        exit 1
esac
