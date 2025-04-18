// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(nome, email) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 1) Clica no botão “REGISTRO”
    const [btn] = await page.$x(
      "//button[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')] | " +
      "//a[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')]"
    );
    if (!btn) throw new Error('Botão REGISTRO não encontrado');
    await btn.click();

    // 2) Aguarda e preenche nome e email
    await page.waitForSelector('input', { timeout: 20000 });
    const inputs = await page.$$('input');
    if (inputs.length < 2) throw new Error('Campos de nome/email não encontrados');
    await inputs[0].type(nome, { delay: 30 });
    await inputs[1].type(email, { delay: 30 });

    // 3) Envia o formulário
    await page.evaluate(() => {
      const b =
        document.querySelector('#register_btn') ||
        document.querySelector('button.js-submit') ||
        document.querySelector('button[type="submit"],input[type="submit"]');
      if (!b) throw new Error('Botão de envio não encontrado');
      b.removeAttribute('disabled');
      b.click();
    });

    // 4) Espera a página de thank-you ou o link aparecer
    await page.waitForFunction(
      () => /thank-you/.test(location.pathname) ||
            !!document.querySelector('a[id^="js_live_link_"]'),
      { timeout: 90000 }
    );

    // 5) Captura o link final
    let link = await page.evaluate(() => {
      const a =
        document.querySelector('a[id^="js_live_link_"]') ||
        Array.from(document.querySelectorAll('a')).find(x =>
          /\/go\/live\//.test(x.href)
        );
      return a ? a.href : null;
    });
    if (!link && /go\/live/.test(page.url())) link = page.url();
    if (!link) throw new Error('Link da sala não encontrado');

    return link;
  } finally {
    await browser.close();
  }
}

/* Para teste local: node register.js */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
