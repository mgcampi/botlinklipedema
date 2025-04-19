const express = require('express');
const puppeteer = require('puppeteer');

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
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

    console.log('Acessando página de registro...');
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await sleep(3000);

    // 🧠 Espera os inputs usando placeholder
    console.log('⏳ Aguardando campos nome e email...');
    await page.waitForSelector('input[placeholder*="primeiro nome"]', { timeout: 15000 });
    await page.waitForSelector('input[placeholder*="e-mail"]', { timeout: 15000 });

    console.log('✍️ Preenchendo nome e e-mail...');
    await page.type('input[placeholder*="primeiro nome"]', nome, { delay: 80 });
    await sleep(500);
    await page.type('input[placeholder*="e-mail"]', email, { delay: 70 });
    await sleep(500);

    console.log('🚀 Enviando formulário...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button.wj-submit');
    if (!submitBtn) throw new Error('❌ Botão de envio não encontrado');

    await submitBtn.click();

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.warn('⌛ Timeout no redirecionamento — continuando...');
    }

    const currentUrl = page.url();
    console.log(`📍 URL atual: ${currentUrl}`);

    let liveLink = await page.evaluate(() => {
      let link = document.querySelector('#js-live_link_1');
      if (link) return link.href;

      const links = Array.from(document.querySelectorAll('a[href*="go/live"]'));
      if (links.length > 0) return links[0].href;

      const allLinks = Array.from(document.querySelectorAll('a[href*="event.webinarjam.com/go/"]'));
      if (allLinks.length > 0) return allLinks[0].href;

      return null;
    });

    if (!liveLink && (currentUrl.includes('/go/live/') || currentUrl.includes('/go/'))) {
      liveLink = currentUrl;
    }

    if (!liveLink) throw new Error('❌ Link não encontrado após envio');

    console.log(`✅ Link encontrado: ${liveLink}`);

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
