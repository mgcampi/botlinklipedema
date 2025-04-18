// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

export async function registrarNoWebinar(
  nome  = 'Automação Teste',
  email = `teste${Date.now()}@mail.com`
) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  let liveLink = null;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* ---------- 1) Procura e clica no botão REGISTRO ---------- */
    let clicked = false;
    for (const frame of page.frames()) {
      clicked = await frame.evaluate(() => {
        const el = [...document.querySelectorAll('button, a')]
          .find(e => /registro/i.test(e.textContent));
        if (el) {
          el.scrollIntoView({ block: 'center' });
          el.click();
          return true;
        }
        return false;
      }).catch(() => false);
      if (clicked) break;
    }
    if (!clicked) throw new Error('Botão REGISTRO não encontrado');
    console.log('✅ Botão REGISTRO clicado');

    /* ---------- 2) Ajuda para buscar elementos em qualquer frame ---------- */
    const findInFrames = async selectors => {
      for (const f of page.frames()) {
        for (const sel of selectors) {
          const h = await f.$(sel);
          if (h) return { frame: f, handle: h };
        }
      }
      return null;
    };

    /* ---------- 3) Preenche nome e e‑mail ---------- */
    const nomeSel  = [
      'input[name="name"]',
      'input[name*="first"]',
      'input[placeholder*="nome" i]',
      'input[id*="name" i]'
    ];
    const emailSel = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="mail" i]',
      'input[id*="email" i]'
    ];

    const n = await findInFrames(nomeSel);
    const e = await findInFrames(emailSel);
    if (!n || !e) throw new Error('Campos de nome ou email não encontrados');

    await n.handle.type(nome,  { delay: 25 });
    await e.handle.type(email, { delay: 25 });
    console.log('✍️  Nome e e‑mail preenchidos');

    /* ---------- 4) Clica no botão de enviar ---------- */
    const enviar = await findInFrames([
      'button[type="submit"]',
      'input[type="submit"]',
      'button.js-submit'
    ]);
    if (enviar) await enviar.handle.click();
    else console.warn('⚠️ Botão de enviar não encontrado (pode ser auto‑submit).');
    console.log('🚀 Formulário enviado');

    /* ---------- 5) Captura link final ---------- */
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    const linkH = await findInFrames([
      'a[href*="go-live"]',
      'a[href*="/live/"]',
      'a[href*="event.webinarjam.com/t/"]',
      'a:contains("Join")',
      'a:contains("Entrar")',
      'a:contains("Acessar")'
    ]);
    liveLink = linkH ? await linkH.handle.evaluate(el => el.href) : page.url();
    console.log('🔗 Link capturado:', liveLink);

    return liveLink;

  } finally {
    await browser.close();
  }
}

/* Teste rápido local */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
