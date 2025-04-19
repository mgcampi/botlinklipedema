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

  console.log(`Iniciando automação para: ${nome} (${email})`);

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

    console.log('⏳ Procurando frame com inputs...');
    let frame = null;
    const maxTries = 20;

    for (let i = 0; i < maxTries; i++) {
      for (const f of page.frames()) {
        try {
          const nameInput = await f.$('input[name="name"]');
          const emailInput = await f.$('input[name="email"]');
          if (nameInput && emailInput) {
            frame = f;
            break;
          }
        } catch (_) {}
      }

      if (frame) break;
      console.log(`⏳ Tentativa ${i + 1}/${maxTries}... inputs ainda não renderizados`);
      await sleep(1000);
    }

    if (!frame) throw new Error('❌ Nenhum frame com inputs encontrados após 20s');

    console.log('✅ Inputs encontrados! Preenchendo...');
    await frame.type('input[name="name"]', nome, { delay: 60 });
    await sleep(300);
    await frame.type('input[name="email"]', email, { delay: 60 });
    await sleep(500);

    console.log('🚀 Clicando em registrar...');
    const submitBtn = await frame.$('button[type="submit"]');
    if (!submitBtn) throw new Error('❌ Botão de envio não encontrado');
    await submitBtn.click();

    try {
      await frame.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.warn('⌛ Timeout no redirecionamento — seguindo mesmo assim...');
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
