#!/bin/bash

if [ "$1" == "" ]; then
	exit 1 # missing args
fi

if [ "$2" == "" ]; then
	exit 1 # missing args
fi

if [ "$3" == "" ]; then
	exit 1 # missing args
fi

if [ "$4" == "" ]; then
	exit 1 # missing args
fi

# env vars
PGPASSWORD=docker
PGUSERNAME=docker
PGHOST=postgis

# encoding // todo!
ENCODING="-W 'LATIN1"
ENCODING=""

# import shapefile
shp2pgsql -s $4 $ENCODING -I "$1" $2 | PGPASSWORD=$PGPASSWORD psql --host=$PGHOST --username=$PGUSERNAME $3