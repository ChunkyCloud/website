FROM node:12
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN yarn build

CMD ["yarn", "start"]
