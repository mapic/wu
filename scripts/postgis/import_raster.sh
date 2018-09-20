#!/bin/bash

if [ -z "$3" ]; then
	echo "Usage: $0 <raster> <table> <database> [<source_srid>]" >&2
	exit 1
fi

INPUTRASTERFILE=$1
TABLENAME=$2
export PGDATABASE=$3
S_SRS=
test -n "$4" && S_SRS="-s_srs EPSG:$4"


export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST


# Reproject to EPSG:3857
RASTERFILE=/tmp/import_raster_$$.tif
gdalwarp -t_srs EPSG:3857 ${S_SRS} ${INPUTRASTERFILE} ${RASTERFILE} || exit 1

TILESIZE="128x128"

# import raster
set -o pipefail # needed to get an error if raster2pgsql errors out
# raster2pgsql \
# 	-s 3857 -I -C -Y \
# 	-t ${TILESIZE} \
#     -l 4,32,128 \
# 	${RASTERFILE} $TABLENAME |
# 	psql -q --set ON_ERROR_STOP=1

# debugging
# raster2pgsql \
#     -s 3857 -I -C -Y \
#     -l 4,32,128 \
#     ${RASTERFILE} $TABLENAME |
#     psql -q --set ON_ERROR_STOP=1


echo "raster2pgsql without tileize etc"
raster2pgsql \
    -s 3857 -I -C -Y \
    ${RASTERFILE} $TABLENAME |
    psql -q --set ON_ERROR_STOP=1
