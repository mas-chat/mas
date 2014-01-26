#!/bin/bash

set -e

mkdir tmp-install-qooxdoo
mkdir -p vendor

cd tmp-install-qooxdoo

wget http://downloads.sourceforge.net/qooxdoo/qooxdoo-3.5-sdk.zip
unzip qooxdoo-3.5-sdk.zip

mv qooxdoo-3.5-sdk ../vendor/qooxdoo-sdk

cd .. && rm -fr tmp-install-qooxdoo
