#!/usr/bin/env bash
# Builds the web app and (re)starts the production stack. Run from anywhere:
#   deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
set -a; source .env; set +a

# The web app calls the API on its subdomain (docs/DECISIONS.md: deployment).
rm -rf web-dist
(cd ../apps/mobile && EXPO_PUBLIC_API_URL="https://api.${DOMAIN}" \
  npx expo export --platform web --output-dir ../../deploy/web-dist)

docker compose --env-file .env up -d --build
docker compose --env-file .env ps
