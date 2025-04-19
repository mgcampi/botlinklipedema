FROM node:20-slim

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Cria diretório de trabalho
WORKDIR /app

# Copia arquivos do projeto
COPY package*.json ./
RUN npm install
COPY . .

# Expõe porta e inicia
EXPOSE 8080
CMD ["npm", "start"]
