#!/bin/bash

. `dirname $0`/run_in_docker.inc


export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST
export PGDATABASE=template1

psql -c "select row_to_json(t) from ( SELECT default_version from pg_available_extensions where name = 'postgis' ) t";
