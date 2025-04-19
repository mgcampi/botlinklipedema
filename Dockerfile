FROM node:20-slim

# Instala dependências do sistema para rodar o Chromium
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-freefont-ttf \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Define diretório de trabalho
WORKDIR /app

# Copia os arquivos
COPY package*.json ./
RUN npm install
COPY . .

# Define variável de ambiente para o Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Porta que o app usa
EXPOSE 8080

# Comando para iniciar
CMD ["npm", "start"]
