# EverydayBench: every site and the control port in one small image (arm64 and amd64).
#   docker build -t everydaybench . && docker run -p 8700:8700 -p 127.0.0.1:8701:8701 everydaybench
FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 compiles itself where it has no prebuilt binary (it doesn't for this Node on arm64).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm seed && pnpm prune --prod

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8700 EVERYDAYBENCH_CONTROL_PORT=8701 EVERYDAYBENCH_CONTROL_HOST=0.0.0.0 EVERYDAYBENCH_DATA=/data/runs
COPY --from=build /app/package.json /app/server.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/control ./control
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/seeds ./seeds
COPY --from=build /app/tasks ./tasks
RUN mkdir -p /data/runs && chown -R node /data
USER node
EXPOSE 8700 8701
CMD ["node", "server.ts"]
