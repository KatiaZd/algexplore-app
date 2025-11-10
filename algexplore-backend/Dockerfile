FROM node:20-alpine
WORKDIR /usr/src/app

COPY algexplore-backend/package*.json ./
RUN npm install

COPY algexplore-backend/. .

EXPOSE 3000
ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
