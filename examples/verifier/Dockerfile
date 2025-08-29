FROM node:18 as base

# Setup pnpm version
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.build.json ./
COPY patches ./patches

COPY packages/model/package.json packages/model/package.json
COPY packages/client/package.json packages/client/package.json

COPY packages/model/src ./packages/model/src
COPY packages/client/src ./packages/client/src

COPY packages/model/tsconfig.json packages/model/tsconfig.json
COPY packages/model/tsconfig.build.json packages/model/tsconfig.build.json
COPY packages/client/tsconfig.json packages/client/tsconfig.json
COPY packages/client/tsconfig.build.json packages/client/tsconfig.build.json

COPY examples/verifier/ examples/verifier/

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

CMD pnpm start:verifier
