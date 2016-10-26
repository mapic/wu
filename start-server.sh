#!/bin/bash

# source config
source /mapic/config/env.sh

# ensure log folder
mkdir -p log

# ensure node modules are installed
NODE_MODULES_DIR=/mapic/modules/engine/node_modules
if [ ! -d "$NODE_MODULES_DIR" ]; then
  echo "Installing node modules..."
  npm install || abort "Failed to install node modules. Quitting!"

fi

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
cd ..