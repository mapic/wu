#!/bin/bash

# . `dirname $0`/run_in_docker.inc

export PAGER="/usr/bin/less -S"
export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST
export PGDATABASE=template1

psql -h postgis $@
