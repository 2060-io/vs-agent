FROM node:20 as base

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json yarn.lock ./

COPY packages/main/package.json packages/main/package.json
COPY packages/main/yarn.lock packages/main/yarn.lock
# COPY ./patches ./patches

# Run install after copying only depdendency file
# to make use of docker layer caching
RUN yarn install

# Copy other depdencies
COPY packages/main/src ./packages/main/src
COPY ./public ./public

COPY tsconfig.json tsconfig.json
COPY tsconfig.build.json tsconfig.build.json
COPY packages/main/tsconfig.build.json packages/main/tsconfig.build.json
COPY packages/main/nest-cli.json packages/main/nest-cli.json

RUN yarn build
CMD yarn start
