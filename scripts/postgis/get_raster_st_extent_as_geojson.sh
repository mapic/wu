#!/bin/bash

. `dirname $0`/run_in_docker.inc

if [ -z "$2" ]; then
  # TODO: also take schema and column !
	echo "Usage: $0 <database> <table> [<column>]"
	exit 1 
fi

DATABASE=$1
TABLE=$2
COL=rast
test -n "$3" && COL="$3"

export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST

export PGDATABASE=$DATABASE

cat<<EOF | psql
SELECT
ST_AsGeoJSON(ST_Extent(ST_Transform(
  ST_Envelope("$COL"::geometry),
4326))) FROM "$TABLE";
EOF
