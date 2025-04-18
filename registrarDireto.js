import puppeteer from 'puppeteer';

export async function registrarDireto(nome, email) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 1) Clica no botão "REGISTRO"
    const [btn] = await page.$x(
      "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'registro')] | " +
      "//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), 'registro')]"
    );
    if (!btn) throw new Error('Botão REGISTRO não encontrado');
    await btn.click();

    // 2) Aguarda o iframe do formulário
    await page.waitForSelector('iframe', { timeout: 20000 });
    const iframeEl = await page.$('iframe');
    const frame = await iframeEl.contentFrame();

    // 3) Preenche nome
    await frame.waitForSelector('input[name="name"], input[name*="first"], input[placeholder*="nome" i]', { timeout: 20000 });
    await frame.type('input[name="name"], input[name*="first"], input[placeholder*="nome" i]', nome, { delay: 30 });

    // 4) Preenche email
    await frame.waitForSelector('input[name="email"], input[type="email"], input[placeholder*="e-mail" i]', { timeout: 20000 });
    await frame.type('input[name="email"], input[type="email"], input[placeholder*="e-mail" i]', email, { delay: 30 });

    // 5) Envia o formulário
    await frame.click('button[type="submit"], input[type="submit"], button.js-submit');

    // 6) Aguarda e captura o link da live
    await frame.waitForSelector('a[href*="/go/live/"]', { timeout: 30000 });
    const liveLink = await frame.$eval('a[href*="/go/live/"]', a => a.href);

    return liveLink;
  } finally {
    await browser.close();
  }
}
