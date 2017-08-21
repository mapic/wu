#!/bin/bash

echo $1

if [ -z "$3" ]; then
	echo "Usage: $0 <database> <owner_name> <owner_uuid>" >&2
  exit 1
fi
DBNAME=$1
OWNER_NAME=$2
OWNER_UUID=$3

export PGPASSWORD=$MAPIC_POSTGIS_PASSWORD
export PGUSER=$MAPIC_POSTGIS_USERNAME
export PGHOST=$MAPIC_POSTGIS_HOST


PSQL="psql --no-password"

# create database
${PSQL} -d template1 -c \
  "CREATE DATABASE ${DBNAME} TEMPLATE systemapic"

export PGDATABASE=${DBNAME}

# add owner_info
TIMESTAMP=$(date +%s)
${PSQL} -c "CREATE TABLE owner_info ( name text, uuid text, created_at integer);"
${PSQL} -c "INSERT INTO owner_info VALUES ('$2', '$3', $TIMESTAMP);"
