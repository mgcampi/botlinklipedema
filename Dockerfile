# Dockerfile
FROM node:18-bullseye-slim

# Instala dependências de sistema necessárias ao Chromium
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
    wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia somente package.json para cache de dependências
COPY package.json package-lock.json* ./
RUN npm install

# Copia o restante do código
COPY . .

EXPOSE 8080

CMD ["npm", "start"]
