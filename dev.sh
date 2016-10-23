#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && pwd )

cd $ROOT

case "$1" in
    start)
        cd server
        yarn run dev
        ;;

    build)
        set -x
        cd client
        yarn
        yarn run bower
        yarn run build
        cd ../server
        yarn
        yarn run prod
        cd website
        yarn
        yarn run prod
        set +x
        echo "Install done."
        ;;

    clean)
        set -x
        rm -fr client/node_modules client/bower_components client/tmp client/dist
        rm -fr server/node_modules
        rm -fr server/website/node_modules server/website/dist
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
