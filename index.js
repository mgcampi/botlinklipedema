const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const app = express();
const port = process.env.PORT || 8080;

puppeteer.use(StealthPlugin());

// Configurações otimizadas
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

// Seletores dinâmicos
const SELECTORS = {
  registerButton: 'button, a', // Seletores genéricos para registro
  nameInput: ['input[name="name"]', '#name', '[data-field="name"]'],
  emailInput: ['input[name="email"]', '#email', '[data-field="email"]'],
  submitButton: 'button[type="submit"], .w-form-formbutton',
  liveLink: [
    'a[id^="js_live_link_"]', // ID dinâmico
    'a[href*="/go/live/"]', // HREF parcial
    '[data-widget-key="liveLink"]' // Atributo data específico
  ]
};

async function findElement(page, selectors) {
  for (const selector of selectors) {
    const element = await page.$(selector);
    if (element) return element;
  }
  return null;
}

app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;
  let browser;

  try {
    // Validação
    if (!nome || !email) throw new Error('Parâmetros nome e email obrigatórios');

    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    // 1. Acessa página de registro
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 2. Clica no botão de registro genérico
    const registerButton = await findElement(page, [SELECTORS.registerButton]);
    if (!registerButton) throw new Error('Botão de registro não encontrado');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 45000 }),
      registerButton.click()
    ]);

    // 3. Preenche formulário com seletores dinâmicos
    const nameInput = await findElement(page, SELECTORS.nameInput);
    const emailInput = await findElement(page, SELECTORS.emailInput);
    
    if (!nameInput || !emailInput) {
      throw new Error('Campos do formulário não encontrados');
    }

    await nameInput.type(nome);
    await emailInput.type(email);

    // 4. Submete formulário
    const submitButton = await findElement(page, [SELECTORS.submitButton]);
    if (!submitButton) throw new Error('Botão de envio não encontrado');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }),
      submitButton.click()
    ]);

    // 5. Busca link de confirmação
    const waitForLink = async (timeout = 90000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const linkElement = await findElement(page, SELECTORS.liveLink);
        if (linkElement) {
          return await page.evaluate(el => el.href || el.textContent, linkElement);
        }
        await page.waitForTimeout(500);
      }
      throw new Error('Link não encontrado após 90 segundos');
    };

    const presentationLink = await waitForLink();

    res.json({
      link: presentationLink,
      debug: {
        finalUrl: page.url(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`🔥 ERRO: ${error.message}`);
    res.status(500).json({
      error: 'Falha na automação',
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
