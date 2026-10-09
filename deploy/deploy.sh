#!/usr/bin/env bash
# Builds the web app and (re)starts the production stack. Run from anywhere:
#   deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

# The web app calls the API on its subdomain (docs/DECISIONS.md: deployment). --clear: Metro's
# cache would otherwise keep a bundle built without EXPO_PUBLIC_API_URL (it calls localhost).
rm -rf web-dist
(cd ../apps/mobile && EXPO_PUBLIC_API_URL="https://api.${DOMAIN}" \
  npx expo export --platform web --clear --output-dir ../../deploy/web-dist)

# Never put online a web app that does not know where its API is.
grep -rq "api.${DOMAIN}" web-dist/_expo || { echo "web-dist: API URL missing" >&2; exit 1; }

docker compose --env-file .env up -d --build
# Caddy still holds the web-dist folder deleted above: it reopens the new one on restart.
docker compose --env-file .env restart caddy
docker compose --env-file .env ps
