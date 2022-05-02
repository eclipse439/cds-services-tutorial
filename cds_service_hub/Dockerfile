FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

EXPOSE 3000 4873
CMD [ "npm", "run", "start-server", "start" ]
