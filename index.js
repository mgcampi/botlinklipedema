const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const app = express();
const port = process.env.PORT || 3000;

puppeteer.use(StealthPlugin()); // Contorna detecção de bot

// Configuração para Railway
const launchOptions = {
  headless: 'new',
  args: [
    '--disable-gpu',
    '--disable-setuid-sandbox',
    '--no-sandbox',
    '--single-process',
    '--no-zygote',
    '--disable-dev-shm-usage'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
};

app.get('/webinarjam', async (req, res) => {
  // ... (mantenha a mesma lógica do endpoint anterior, mas com estes ajustes)
  
  try {
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // Debug: Capture screenshot em caso de erro
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // ... (restante do código de preenchimento)

    // Espera híbrida (DOM + timeout customizável)
    await page.waitForSelector('#js-live_link_1', {
      visible: true,
      timeout: 90000
    }).catch(async () => {
      await page.screenshot({ path: '/tmp/error.png' });
      throw new Error('Elemento não encontrado após 90s');
    });

    // ... (restante do código)
  }
});
