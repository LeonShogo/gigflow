#!/bin/sh
set -eu

if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    postgresql://*@*)
      export SPRING_DATASOURCE_URL="jdbc:postgresql://${DATABASE_URL#*@}"
      ;;
    *)
      echo "DATABASE_URL hat nicht das erwartete PostgreSQL-Format." >&2
      exit 1
      ;;
  esac
fi

export SERVER_PORT="${SERVER_PORT:-${PORT:-8080}}"

exec java -jar /app/app.jar
