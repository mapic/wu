#!/bin/bash

# source config
# source /mapic/config/env.sh

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

# ensure
cd /mapic/engine

# update config from ENV
node script/update-config.js

# start prodmode
if $MAPIC_PRODMODE; then
	cd server
	echo 'Production mode'
	grunt prod 
	echo 'Running in production mode...'
	forever server.js prod

# start dev mode
else
	cd server
	echo 'Development mode'
	grunt dev 
	# grunt watch &
	echo 'Running in development mode...'
	nodemon --watch ../api --watch /mapic/config --watch server.js --watch ../routes server.js
fi
