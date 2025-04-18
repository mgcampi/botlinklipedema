const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const app = express();
const port = process.env.PORT || 8080;

// Configuração crítica para cloud
puppeteer.use(StealthPlugin());
const browserConfig = {
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--single-process'
  ],
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
};

// Middlewares
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'WebinarJam Automator');
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    node: process.version,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
  });
});

// Endpoint principal
app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  let browser;

  try {
    // Validação
    if (!nome || !email) throw new Error('Parâmetros nome e email obrigatórios');

    // Inicia navegador
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    // Navegação
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Preenchimento
    await page.type('input[name="name"]', nome);
    await page.type('input[name="email"]', email);

    // Submissão
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);

    // Captura do link
    await page.waitForSelector('#js-live_link_1', {
      visible: true,
      timeout: 90000
    });
    
    const link = await page.$eval('#js-live_link_1', el => el.href);
    res.json({ link });

  } catch (error) {
    console.error(`🔥 ERRO: ${error.message}`);
    res.status(500).json({
      error: 'Falha na automação',
      details: error.message
    });
  } finally {
    if (browser) await browser.close();
  }
});

// Inicialização segura
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor ativo na porta ${port}`);
  console.log(`🛠 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚙️ Chromium path: ${browserConfig.executablePath}`);
});
