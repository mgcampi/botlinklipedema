FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY .npmrc .

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

RUN npm install --production

COPY . .

CMD ["node", "index.js"]
