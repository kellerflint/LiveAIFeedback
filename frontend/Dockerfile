FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
