
# We assume there's no "docker" command inside the docker
which docker && {
  echo "We're probably outside the engine docker"
  test -n "$MAPIC_DOMAIN" || {
    echo "Setting MAPIC_DOMAIN env to localhost" >&2
    MAPIC_DOMAIN=localhost
    
  }
  TMP=${MAPIC_DOMAIN%.*} # hacky, lacking bash skillz!
  DOMAIN=${TMP%.*}             
  container=${DOMAIN}_engine_1
  echo "Executing myself inside container ${container}"
  if test -t 0; then
    TTYSWITCH=-t
  else
    TTYSWITCH=
  fi
  exec docker exec -i ${TTYSWITCH} ${container} \
    ./scripts/postgis/`basename $0` $@
}

