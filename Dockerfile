FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build:backend

EXPOSE 5000

CMD ["npm", "start"]
