#!/usr/bin/env bash

set -e

ROOT=$( cd $( dirname "${BASH_SOURCE[0]}" ) && pwd )

cd $ROOT

case "$1" in
    start)
        forego start -f Procfile.dev -e conf/env.dev
        ;;

    install)
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
        redis-cli FLUSHALL
        ./server/bin/create-db
        echo "Redis reset done."
        ;;
    *)
        echo $"Usage: $0 {start|install|resetdb}"
        exit 1
esac
