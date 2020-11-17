FROM node:12 AS build-deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile
COPY . ./
RUN yarn build

FROM node:12-alpine
RUN yarn global add @wertarbyte/webapp-server
COPY --from=build-deps /usr/src/app/build /usr/src/app
CMD ["webapp-server", "/usr/src/app"]
