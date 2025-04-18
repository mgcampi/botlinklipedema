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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let liveLink = null;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* 1) clica no REGISTRO (mesmo XPath de antes) */
    const btn = await page.waitForXPath(
      `//button[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')]
       | //a[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'registro')]`,
      { timeout: 20000 }
    );
    await btn.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await btn.click();

    /* 2) acha inputs em qualquer iframe, preenche e envia (mesma lógica) */
    const findInFrames = async selectors => {
      for (const f of page.frames()) {
        for (const sel of selectors) {
          const h = await f.$(sel);
          if (h) return { frame: f, handle: h };
        }
      }
      return null;
    };
    const nomeSel  = ['input[name="name"]','input[name*="first"]','input[placeholder*="nome" i]','input[id*="name" i]'];
    const emailSel = ['input[name="email"]','input[type="email"]','input[placeholder*="mail" i]','input[id*="email" i]'];

    const n = await findInFrames(nomeSel);
    const e = await findInFrames(emailSel);
    if (!n || !e) throw new Error('Campos não encontrados');
    await n.handle.type(nome,  { delay: 25 });
    await e.handle.type(email, { delay: 25 });

    const enviar = await findInFrames(['button[type="submit"]','input[type="submit"]','button.js-submit']);
    if (enviar) await enviar.handle.click(); else console.warn('submit não achado');

    /* 3) captura link final */
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    const linkH = await findInFrames([
      'a[href*="go-live"]','a[href*="/live/"]',
      'a[href*="event.webinarjam.com/t/"]','a:contains("Join")','a:contains("Entrar")'
    ]);
    liveLink = linkH ? await linkH.handle.evaluate(el => el.href) : page.url();
    return liveLink;

  } finally {
    await browser.close();
  }
}
