FROM node:18

WORKDIR /app

# Copia apenas package.json primeiro pra aproveitar cache do Docker
COPY package.json package-lock.json* ./
RUN npm install

# Copia o restante do código
COPY . .

# (Opcional) lib pra rodar Chromium, remova se não usar Puppeteer
RUN apt-get update && apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 \
  libasound2 libpangocairo-1.0-0 libxss1 libgtk-3-0 libxshmfence1 libglu1

CMD ["npm", "start"]
