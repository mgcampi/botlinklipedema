# Dockerfile otimizado para Puppeteer + Railway

FROM node:18-bullseye-slim

# Instala dependências de sistema para o Chromium do Puppeteer
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libasound2 \
    libxshmfence1 \
    libglu1 \
    lsb-release \
    wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia primeiro apenas package.json para aproveitar cache de layers
COPY package.json package-lock.json* ./

# Instala as dependências do Node (incluindo Puppeteer)
RUN npm install

# Copia o restante do código
COPY . .

# Exponha a porta que o Express vai usar
EXPOSE 8080

# Inicia o seu servidor
CMD ["npm", "start"]
