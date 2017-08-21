#!/bin/bash


if [ "$1" == "" ]; then
	echo "Must provide database as first argument,"
	echo ""
	exit 1 # missing args
fi

if [ "$2" == "" ]; then
	echo "Must provide folder as second argument,"
	echo ""
	exit 1 # missing args
fi

if [ "$3" == "" ]; then
	echo "Must provide query as third argument,"
	echo ""
	exit 1 # missing args
fi


export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST

pgsql2shp -u $PGUSERNAME -P $PGPASSWORD -f "$2" "$1" "$3"

