FROM node:18-slim

RUN apt-get update && apt-get install -y git

COPY . /opt/blob-api

WORKDIR /opt/blob-api/api

RUN npm i

RUN npx prisma migrate dev

ENTRYPOINT [ "npm", "start" ]