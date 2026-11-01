FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
COPY workers/nightly-sync/package.json workers/nightly-sync/package-lock.json ./
RUN npm ci --include=dev --ignore-scripts
COPY lib ./lib
COPY utils ./utils
COPY workers/nightly-sync ./workers/nightly-sync
RUN node workers/nightly-sync/build.cjs && npm prune --omit=dev --ignore-scripts

FROM node:22.22.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/workers/nightly-sync/dist ./workers/nightly-sync/dist
COPY workers/nightly-sync/run.cjs ./workers/nightly-sync/run.cjs
USER node
CMD ["node", "workers/nightly-sync/run.cjs"]
