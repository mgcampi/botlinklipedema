FROM node:18

WORKDIR /app

COPY . .

# Instala bibliotecas que o Puppeteer precisa pra rodar o Chromium
RUN apt-get update && apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libxss1 \
  libgtk-3-0 \
  libxshmfence1 \
  libglu1

RUN npm install

CMD ["npm", "start"]
