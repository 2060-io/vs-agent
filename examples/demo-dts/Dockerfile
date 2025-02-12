FROM node:22-alpine as base

# Setup yarn version
RUN corepack enable
RUN yarn set version 3.6.4
RUN corepack prepare yarn@3.6.4 --activate

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json yarn.lock tsconfig.json tsconfig.build.json .yarnrc.yml ./
COPY .yarn/releases/ .yarn/releases/
COPY .yarn/plugins/ .yarn/plugins/
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

RUN yarn install
RUN yarn build

FROM base as final

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY examples/demo-dts/ examples/demo-dts/

# Run install after copying only depdendency file
# to make use of docker layer caching
COPY --from=base /www/packages ./packages
WORKDIR /www/examples/chatbot
RUN yarn install
RUN yarn build

WORKDIR /www/examples/demo-dts/build
CMD ["node", "main.js"]
