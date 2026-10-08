# API image (docs/DECISIONS.md: deployment). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t fama-api .
# The container applies pending migrations, then starts the API on $PORT (3000 by default).
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
# The mobile app is not part of this image (see .dockerignore): install only the API and shared.
RUN pnpm install --frozen-lockfile --filter api... \
  && pnpm generate \
  && pnpm --filter api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main"]
