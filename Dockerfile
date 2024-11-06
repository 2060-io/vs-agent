FROM node:20 as base

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json yarn.lock ./

COPY packages/models/package.json packages/models/package.json
COPY packages/main/package.json packages/main/package.json
# COPY ./patches ./patches

# Run install after copying only depdendency file
# to make use of docker layer caching
RUN yarn install

# Copy other depdencies
COPY packages/models/src ./packages/models/src
COPY packages/main/src ./packages/main/src
COPY ./public ./public

COPY tsconfig.json tsconfig.json
COPY tsconfig.build.json tsconfig.build.json

COPY packages/models/tsconfig.json packages/models/tsconfig.json
COPY packages/models/tsconfig.build.json packages/models/tsconfig.build.json

COPY packages/main/tsconfig.json packages/main/tsconfig.json
COPY packages/main/tsconfig.build.json packages/main/tsconfig.build.json
COPY packages/main/nest-cli.json packages/main/nest-cli.json

RUN yarn build
CMD yarn start
