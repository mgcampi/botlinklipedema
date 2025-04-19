FROM node:20-slim

# Instala dependências do Chromium
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-freefont-ttf \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Cria diretório de trabalho
WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia todos os arquivos
COPY . .

# Expõe a porta da API
EXPOSE 8080

# Inicia o servidor
CMD ["npm", "start"]
