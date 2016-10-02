#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && pwd )

cd $ROOT

case "$1" in
    start)
        ./server/node_modules/.bin/nf --procfile Procfile.dev --env conf/env.dev start
        ;;

    build)
        cd client
        npm install
        npm run bower
        npm run build
        cd ../server
        npm install
        npm run prod
        cd website
        npm install
        npm run prod
        echo "Install done."
        ;;

    clean)
        rm -fr client/node_modules client/bower_components client/tmp client/dist
        rm -fr server/node_modules
        rm -fr server/website/node_modules server/website/dist
        echo "Clean done."
        ;;

    resetdb)
        echo -n "!!! Are you absolutely sure this is a development environment? [yes/NO] "
        read ANSWER
        if [ "$ANSWER" = "yes" ]; then
            redis-cli FLUSHALL
            ./server/bin/create-db
            echo "Redis reset done."
        else
            echo "Cancelled."
        fi
        ;;
    *)
        echo $"Usage: $0 {start|build|clean|resetdb}"
        exit 1
esac
