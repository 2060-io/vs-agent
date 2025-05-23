FROM node:18 as base

# Setup pnpm version
RUN corepack enable

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.build.json ./

# Run install after copying only depdendency file
# to make use of docker layer caching
RUN pnpm install

# Copy other depdencies
COPY ./index.ts ./index.ts
COPY tsconfig.json tsconfig.json

RUN pnpm build

CMD pnpm start
