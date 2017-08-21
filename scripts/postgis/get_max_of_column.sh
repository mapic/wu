#!/bin/bash


if [ "$1" == "" ]; then
	echo "Must provide database as first argument,"
	echo ""
	exit 1 # missing args
fi

if [ "$2" == "" ]; then
	echo "Must provide table as second argument,"
	echo ""
	exit 1 # missing args
fi

if [ "$3" == "" ]; then
	echo "Must provide column as third argument,"
	echo ""
	exit 1 # missing args
fi


export PGDATABASE=$1
export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST
export PSQL="psql --no-password"
export PGAPPNAME=$PGAPPNAME`basename $0`

$PSQL -c "select row_to_json(t) from (select MAX($3), MIN($3), AVG($3) from $2) t;"

