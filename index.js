const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 8080;

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

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    const csrfToken = "eyJpdiI6Im5TY2lSOWFrVDBIc05LcE1mRTB5N2c9PSIsInZhbHVlIjoid1VFU1o2RlQ3eDZKa3dMR21KbUpHdUtGdTdOdU1MeVBzLzdaK0dSWVhJOE9TZUR1N25WVGhtR0NoRnZyMVliaWFjaU9xWEsxcUNZY0VaeG1Icld6V3BhVmZua0VFaThCS0tUd2g4VEcyaklQSjFXd0ZibytWNWlvaDRvQTNyTG8iLCJtYWMiOiIxOTI2ZTAyMmMwMWRhY2EyZTViZTk0MGE4NDEyODI4MzllY2RkMDVhMmZjNGVlOTI5M2I3ODE4MTZkNzJjMjI0IiwidGFnIjoiIn0%3D";

    await page.setCookie({
      name: 'XSRF-TOKEN',
      value: csrfToken,
      domain: 'event.webinarjam.com',
      path: '/',
      httpOnly: false,
      secure: true
    });

    console.log('Acessando página de registro...');
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    // 🔍 Encontra botão "REGISTRO" em qualquer frame
    let registroFrame = null;
    let registroButton = null;

    for (const frame of page.frames()) {
      const btnHandle = await frame.$x("//button[contains(translate(., 'REGISTRO', 'registro'), 'registro')]");
      if (btnHandle.length > 0) {
        registroFrame = frame;
        registroButton = btnHandle[0];
        break;
      }
    }

    if (!registroButton) throw new Error('❌ Botão REGISTRO não encontrado em nenhum frame');

    console.log('✅ Botão REGISTRO encontrado — clicando...');
    await registroButton.click();

    console.log('⏳ Aguardando formulário aparecer...');
    await registroFrame.waitForSelector('input[name="name"]', { timeout: 15000 });
    await registroFrame.waitForSelector('input[name="email"]', { timeout: 15000 });

    console.log('✍️ Preenchendo nome e e-mail...');
    for (const char of nome) {
      await registroFrame.type('input[name="name"]', char, { delay: 100 + Math.random() * 100 });
    }
    await page.waitForTimeout(500);
    for (const char of email) {
      await registroFrame.type('input[name="email"]', char, { delay: 80 + Math.random() * 100 });
    }
    await page.waitForTimeout(1000);

    console.log('🚀 Enviando formulário...');
    const sendBtn = await registroFrame.$('button[type="submit"], button.js-submit, input[type="submit"]');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      throw new Error('⚠️ Botão de enviar não encontrado');
    }

    try {
      await registroFrame.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.log('⌛ Redirecionamento falhou, mas continuando...');
    }

    const currentUrl = page.url();
    console.log(`URL atual: ${currentUrl}`);

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

    if (!liveLink) {
      throw new Error('Link não encontrado na página de agradecimento');
    }

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

    if (used > 350) {
      console.warn('⚠️ Uso de memória alto, considere reiniciar o processo');
    }
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
