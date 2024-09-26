FROM node:18 as base

FROM base as final

# AFJ specifc setup
WORKDIR /www
ENV RUN_MODE="docker"

COPY package.json package.json
COPY yarn.lock yarn.lock

# Run install after copying only depdendency file
# to make use of docker layer caching
RUN yarn install

# Copy other depdencies
COPY ./index.ts ./index.ts
COPY ./data.ts ./data.ts
COPY ./phone-cred-def-dev.json ./phone-cred-def-dev.json
COPY tsconfig.json tsconfig.json

RUN yarn build
COPY ./public ./build/public
CMD yarn start
