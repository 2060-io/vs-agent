FROM node:18 as base

# Setup pnpm version
RUN corepack enable

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY patches ./patches
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json tsconfig.build.json ./

COPY packages/model/package.json packages/model/package.json
COPY packages/client/package.json packages/client/package.json

COPY packages/model/src ./packages/model/src
COPY packages/client/src ./packages/client/src

COPY packages/model/tsconfig.json packages/model/tsconfig.json
COPY packages/model/tsconfig.build.json packages/model/tsconfig.build.json
COPY packages/client/tsconfig.json packages/client/tsconfig.json
COPY packages/client/tsconfig.build.json packages/client/tsconfig.build.json

COPY examples/chatbot/package.json examples/chatbot/package.json
COPY examples/chatbot/tsconfig.json examples/chatbot/tsconfig.json
COPY examples/chatbot/data.ts examples/chatbot/data.ts
COPY examples/chatbot/index.ts examples/chatbot/index.ts
COPY examples/chatbot/public/ examples/chatbot/public/

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM base as final

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

# Run install after copying only depdendency file
# to make use of docker layer caching
COPY --from=base /www/packages ./packages
COPY --from=base /www/examples ./examples

CMD pnpm start:chatbot
