FROM node:18 as base

COPY package.json yarn.lock tsconfig.json tsconfig.build.json ./
COPY packages/model/package.json packages/model/package.json
COPY packages/client/package.json packages/client/package.json

COPY packages/model/src ./packages/model/src
COPY packages/client/src ./packages/client/src

COPY packages/model/tsconfig.json packages/model/tsconfig.json
COPY packages/model/tsconfig.build.json packages/model/tsconfig.build.json
COPY packages/client/tsconfig.json packages/client/tsconfig.json
COPY packages/client/tsconfig.build.json packages/client/tsconfig.build.json

RUN yarn install
RUN yarn build

FROM base as final

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY examples/verifier/package.json examples/verifier/package.json
COPY examples/verifier/yarn.lock examples/verifier/yarn.lock

# Run install after copying only depdendency file
# to make use of docker layer caching
COPY --from=base packages/model /www/packages/model
COPY --from=base packages/client /www/packages/client
RUN yarn --cwd examples/verifier install


# Copy other depdencies
COPY examples/verifier/index.ts examples/verifier/index.ts
COPY examples/verifier/tsconfig.json examples/verifier/tsconfig.json

RUN yarn --cwd examples/verifier build
CMD yarn --cwd examples/verifier start
