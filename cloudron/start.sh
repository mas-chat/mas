#!/bin/bash

# clear cache
echo "Clearing caches"
mkdir -p /app/cache
rm -rf /app/cache/*

mkdir -p /app/data/uploads

# generate config
echo "Generating config"
if [[ ! -f "/app/code/mas.conf" ]]; then
    sed -e "s/##DOMAIN/${HOSTNAME}/" \
        -e "s,##SITE_URL,https://${HOSTNAME}," \
        -e "s/##ADMIN_EMAIL/${MAIL_SMTP_USERNAME}@${MAIL_DOMAIN}/" \
        -e "s/##REDIS_PORT/${REDIS_PORT}/" \
        -e "s/##REDIS_HOST/${REDIS_HOST}/" \
        -e "s/##REDIS_PASSWORD/${REDIS_PASSWORD}/" \
        -e "s/##MAIL_SMTP_SERVER/${MAIL_SMTP_SERVER}/" \
        -e "s/##MAIL_SMTP_PORT/${MAIL_SMTP_PORT}/" \
        /app/code/cloudron/mas.conf.template > /app/code/mas.conf
fi

echo "Starting pm2"
pm2 --no-daemon start apps.json
