#!/usr/bin/env bash

sh -e /etc/init.d/xvfb start
echo 'Installing SlimerJS'

wget http://download.slimerjs.org/v0.9/0.9.3/slimerjs-0.9.3.zip

unzip slimerjs-0.9.3.zip
mv slimerjs-0.9.3 ./slimerjs
