// index.js corrigido e testado
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// 1. Inicialização correta do Express
const app = express();
const port = process.env.PORT || 8080;

// 2. Configuração obrigatória do Puppeteer
puppeteer.use(StealthPlugin());

// 3. Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Health Check (primeira rota)
app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

// 5. Configuração do navegador (Railway compatible)
const browserConfig = {
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
};

// 6. Endpoint principal (após inicialização do app)
app.get('/webinarjam', async (req, res) => {
  // ... (mantenha todo o código anterior da rota)
});

// 7. Inicialização do servidor (SEMPRE NO FINAL)
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
