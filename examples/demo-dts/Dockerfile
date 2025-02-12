FROM node:22-alpine as base

COPY package.json yarn.lock tsconfig.json tsconfig.build.json ./
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

COPY examples/demo-dts/package.json examples/demo-dts/package.json
COPY examples/demo-dts/yarn.lock examples/demo-dts/yarn.lock

# Run install after copying only depdendency file
# to make use of docker layer caching
COPY --from=base packages/model /www/packages/model
COPY --from=base packages/client /www/packages/client
COPY --from=base packages/nestjs-client /www/packages/nestjs-client
RUN yarn --cwd examples/demo-dts install


# Copy other depdencies
COPY examples/demo-dts/tsconfig.build.json examples/demo-dts/tsconfig.build.json
COPY examples/demo-dts/tsconfig.json examples/demo-dts/tsconfig.json
COPY examples/demo-dts/src examples/demo-dts/src
RUN yarn --cwd examples/demo-dts build

WORKDIR /www/examples/demo-dts/build
CMD ["node", "main.js"]
