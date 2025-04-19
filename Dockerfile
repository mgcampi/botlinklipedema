# Usa imagem leve com Node.js
FROM node:20-slim

# Instala Chromium e fontes necessárias
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-ipafont-gothic \
  fonts-freefont-ttf \
  && rm -rf /var/lib/apt/lists/*

# Define diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala dependências do projeto
RUN npm install

# Copia o restante do código
COPY . .

# Define variável de ambiente necessária pro Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expõe a porta que o app vai rodar
EXPOSE 8080

# Comando pra rodar a aplicação
CMD ["node", "index.js"]
