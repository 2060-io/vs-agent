FROM node:22-alpine as base

# Setup pnpm version
RUN corepack enable

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.build.json ./
COPY packages/model/package.json packages/model/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/nestjs-client/package.json packages/nestjs-client/package.json

COPY packages/model/src ./packages/model/src
COPY packages/client/src ./packages/client/src
COPY packages/nestjs-client/src ./packages/nestjs-client/src

COPY packages/model/tsconfig.json packages/model/tsconfig.json
COPY packages/model/tsconfig.build.json packages/model/tsconfig.build.json
COPY packages/client/tsconfig.json packages/client/tsconfig.json
COPY packages/client/tsconfig.build.json packages/client/tsconfig.build.json
COPY packages/client/tsconfig.json packages/nestjs-client/tsconfig.json
COPY packages/client/tsconfig.build.json packages/nestjs-client/tsconfig.build.json

COPY examples/nestjs-vs/ examples/nestjs-vs/

RUN pnpm install
RUN pnpm build

FROM base as final

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

# Run install after copying only depdendency file
# to make use of docker layer caching
COPY --from=base /www/packages ./packages
COPY --from=base /www/examples ./examples

WORKDIR /www/examples/nestjs-vs/build
CMD ["node", "main.js"]
