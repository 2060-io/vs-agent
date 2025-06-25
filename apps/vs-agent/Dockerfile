FROM node:22 as base

# Setup pnpm version
RUN corepack enable

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

COPY packages/model/package.json packages/model/package.json
COPY packages/main/package.json packages/main/package.json
# COPY ./patches ./patches

# Run install after copying only depdendency file
# to make use of docker layer caching
RUN pnpm install

# Copy other depdencies
COPY packages/model/src ./packages/model/src
COPY packages/main/src ./packages/main/src
COPY ./public ./public

COPY tsconfig.json tsconfig.json
COPY tsconfig.build.json tsconfig.build.json
COPY packages/main/discovery.json packages/main/discovery.json

COPY packages/model/tsconfig.json packages/model/tsconfig.json
COPY packages/model/tsconfig.build.json packages/model/tsconfig.build.json

COPY packages/main/tsconfig.json packages/main/tsconfig.json
COPY packages/main/tsconfig.build.json packages/main/tsconfig.build.json
COPY packages/main/nest-cli.json packages/main/nest-cli.json

RUN pnpm build
CMD pnpm start
