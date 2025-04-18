// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

/* pausa utilitária -------------------------------------------------------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(
  nome  = 'Automação Teste',
  email = `teste${Date.now()}@mail.com`
) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    /* 0) tela de registro ------------------------------------------------ */
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* 1) clica em REGISTRO ---------------------------------------------- */
    const btn = await page.$x(
      "//button[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')] | " +
      "//a[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')]"
    );
    if (!btn.length) throw new Error('Botão REGISTRO não encontrado');
    await btn[0].click();

    /* 2) espera inputs --------------------------------------------------- */
    await page.waitForSelector('input', { timeout: 20000 });
    const inputs = await page.$$eval('input', els => els.map(e => e.name || e.type));
    if (inputs.length < 2) throw new Error('Menos de 2 inputs no DOM');
    const [nomeIn, emailIn] = await page.$$('input');

    await nomeIn.type(nome);
    await emailIn.type(email);

    /* 3) envia formulário ------------------------------------------------ */
    const sendBtn = await page.$('button[type="submit"],input[type="submit"],button.js-submit');
    if (sendBtn) await sendBtn.click();
    else throw new Error('Botão de envio não encontrado');

    console.log('🚀 Formulário enviado – aguardando thank‑you');

    /* 4) espera redirecionar p/ /registration/thank-you/… --------------- */
    await page.waitForFunction(
      () => /\/registration\/thank-you\//.test(location.pathname),
      { timeout: 90000 }
    );

    /* 5) espera link js_live_link_ aparecer ----------------------------- */
    await page.waitForSelector('a[id^="js_live_link_"]', { timeout: 90000 });
    const liveLink = await page.$eval('a[id^="js_live_link_"]', a => a.href);

    if (!liveLink) throw new Error('Anchor js_live_link_ sem href!');
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* teste local ------------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`)
  registrarNoWebinar().then(console.log).catch(console.error);
