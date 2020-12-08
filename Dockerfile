FROM node:12 AS build-deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile
COPY . ./
RUN yarn build

CMD ["yarn", "start"]
