#!/bin/bash

# source config
source /mapic/config/env.sh

# ensure log folder
mkdir -p log

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
	grunt watch &
	echo 'Running in development mode...'
	nodemon --watch ../api --watch /mapic/config --watch server.js --watch ../routes server.js
fi
cd ..