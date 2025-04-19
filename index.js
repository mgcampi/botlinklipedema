const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 8080;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

app.get('/webinarjam', async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros obrigatórios: nome e email'
    });
  }

  console.log(`Iniciando automação forçada para: ${nome} (${email})`);

  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: null,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    console.log('Acessando página de registro...');
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('⏳ Procurando iframe para injetar HTML...');
    let targetFrame = null;

    for (let i = 0; i < 10; i++) {
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const bodyHandle = await frame.$('body');
          if (bodyHandle) {
            const bodyContent = await frame.evaluate(() => document.body.innerHTML);
            if (bodyContent.trim() === '') {
              targetFrame = frame;
              break;
            }
          }
        } catch (_) {}
      }

      if (targetFrame) break;
      await sleep(1000);
    }

    if (!targetFrame) throw new Error('❌ Nenhum iframe vazio encontrado para injetar o formulário');

    console.log('💉 Injetando HTML do formulário no frame...');
    await targetFrame.evaluate(() => {
      document.body.innerHTML = `
        <form id="fakeForm">
          <input name="name" placeholder="Insira o primeiro nome..." />
          <input name="email" placeholder="Insira o e-mail..." />
          <button type="submit">Inscrever</button>
        </form>
      `;
    });

    await sleep(1000);

    console.log('✍️ Preenchendo formulário injetado...');
    await targetFrame.type('input[name="name"]', nome, { delay: 60 });
    await sleep(300);
    await targetFrame.type('input[name="email"]', email, { delay: 60 });
    await sleep(500);

    console.log('🚀 Submetendo formulário fake...');
    await targetFrame.$eval('#fakeForm', form => form.submit());

    // Esperar possível redirecionamento
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.warn('⌛ Timeout no redirecionamento — continuando...');
    }

    const currentUrl = page.url();
    console.log(`📍 URL atual: ${currentUrl}`);

    let liveLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="go/live"], a[href*="/go/"]'));
      return links.length ? links[0].href : null;
    });

    if (!liveLink && currentUrl.includes('/go/')) {
      liveLink = currentUrl;
    }

    if (!liveLink) throw new Error('❌ Link não encontrado após envio');

    console.log(`✅ Link final: ${liveLink}`);

    return res.json({
      success: true,
      nome,
      email,
      link: liveLink,
      pagina_confirmacao: currentUrl
    });

  } catch (error) {
    console.error('Erro na automação:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('🧹 Navegador fechado');
    }

    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`📦 Uso de memória: ${Math.round(used * 100) / 100} MB`);
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
