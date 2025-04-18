const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 8080;

// Healthcheck
app.get('/ping', (_, res) => res.send('pong'));

app.get('/webinarjam', async (req, res) => {
  const nome = req.query.nome || 'Automação';
  const email = req.query.email || `teste${Date.now()}@email.com`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.type('input[name="name"]', nome);
    await page.type('input[name="email"]', email);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);

    const link = await page.evaluate(() => {
      const el = document.querySelector('a[href*="go/live/2"]');
      return el ? el.href : null;
    });

    await browser.close();

    if (!link) {
      return res.status(404).json({ success: false, error: "Link não encontrado" });
    }

    return res.json({ success: true, link });
  } catch (err) {
    await browser.close();
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
