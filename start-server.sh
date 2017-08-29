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
node scripts/update-config.js

# start engine
cd server
grunt dev 
forever -m 100 --spinSleepTime 1000 -f -v -w --watchDirectory ../api server.js

# # start prodmode
# cd server
# if [[ "$MAPIC_PRODUCTION_MODE" == "true" ]]; then
# 	echo 'Production mode'
# 	grunt prod 
# 	echo 'Running in production mode...'
# 	# forever server.js prod
# 	forever -m 100 --spinSleepTime 1000 -f -v -w --watchDirectory ../api server.js

# # start dev mode
# else
# 	echo 'Development mode'
# 	grunt dev 
# 	echo 'Running in development mode...'
# 	# nodemon --watch ../api --watch /mapic/config --watch server.js --watch ../routes server.js
# 	forever -m 100 --spinSleepTime 1000 -f -v -w --watchDirectory ../api server.js

# fi
