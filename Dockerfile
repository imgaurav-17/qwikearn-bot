FROM node:16.13.1

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install

COPY . /app

CMD ["node", "main.js"]
