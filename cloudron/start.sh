#!/bin/bash

# clear cache
echo "Clearing caches"
mkdir -p /app/cache
rm -rf /app/cache/*

# generate config
echo "Generting config"
if [[ ! -f "/app/code/mas.conf" ]]; then
    # TODO: generate mas.conf here
    sed -e 's/##DOMAIN/${HOSTNAME}/' \
        -e 's/##ADMIN_EMAIL/${MAIL_SMTP_USERNAME}@${MAIL_DOMAIN}/' \
        -e 's/##REDIS_PORT/${REDIS_PORT}/' \
        -e 's/##REDIS_HOST/${REDIS_HOST}/' \
        -e 's/##REDIS_PASSWORD/${REDIS_PASSWORD}/' \
        /app/code/cloudron/mas.conf.template > /app/code/mas.conf
fi

echo "Starting pm2"
pm2 --no-daemon start apps.json
