FROM node:20-alpine
WORKDIR /usr/src/app

COPY algexplore-frontend/package*.json ./
RUN npm install

COPY algexplore-frontend/. .

EXPOSE 4200
ENV CHOKIDAR_USEPOLLING=true
ENV NG_CLI_ANALYTICS=ci

CMD ["npm", "start"]
