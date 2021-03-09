FROM node:12-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN yarn
COPY . ./
RUN yarn build

CMD ["yarn", "start"]