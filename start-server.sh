#!/bin/bash

# ensure log folder
mkdir -p /mapic/engine/log

# install packages
yarn config set cache-folder /mapic/engine/.yarn
yarn install

# hack: fix express.io until we fix properly
# see https://github.com/mapic/engine/issues/14
FOLDER=/mapic/engine/node_modules/express.io/node_modules
if [ ! -z $FOLDER/express/node_modules ]; then
	cd $FOLDER
	cd express
	ln -s $FOLDER node_modules
fi

# go to folder
cd /mapic/engine

# update config from ENV
echo "Updating config..."
cp default.config.js config.js
node scripts/update-config.js

# start engine
cd server
grunt dev 
forever -m 100 --spinSleepTime 1000 -f -v -w --watchDirectory ../api server.js