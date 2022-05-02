FROM node:alpine

WORKDIR /usr/src/app

COPY ./cds_service_hub/package*.json ./
RUN npm install

EXPOSE 3000
CMD [ "npm", "run", "start-server", "start" ]
