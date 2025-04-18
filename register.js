// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(
  nome  = 'Automação Teste',
  email = `teste${Date.now()}@mail.com`,
  timeoutMs = 60000              // máx. 60 s para aparecer o link
) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* 1) clica em REGISTRO --------------------------------------------- */
    for (const f of page.frames()) {
      try {
        const ok = await f.evaluate(() => {
          const el = [...document.querySelectorAll('button,a')]
            .find(e => /registro/i.test(e.textContent));
          if (el) { el.scrollIntoView(); el.click(); return true; }
          return false;
        });
        if (ok) break;
      } catch (_) {}
    }

    /* 2) preenche nome e email ----------------------------------------- */
    let inputs;
    const deadlineIn = Date.now() + 20000;
    while (Date.now() < deadlineIn && !inputs) {
      for (const f of page.frames()) {
        try {
          const ins = await f.$$('input');
          if (ins.length >= 2) { inputs = ins; break; }
        } catch (_) {}
      }
      if (!inputs) await sleep(300);
    }
    if (!inputs) throw new Error('Inputs não encontrados');
    await inputs[0].type(nome);
    await inputs[1].type(email);

    /* 3) envia ---------------------------------------------------------- */
    for (const f of page.frames()) {
      try {
        const ok = await f.evaluate(() => {
          const b = document.querySelector(
            'button[type="submit"],input[type="submit"],button.js-submit');
          if (b) { b.click(); return true; }
          return false;
        });
        if (ok) break;
      } catch (_) {}
    }

    /* 4) espera o anchor js_live_link_ aparecer ------------------------ */
    const linkHandle = await page.waitForFunction(() => {
      const a = document.querySelector('a[id^="js_live_link_"]') ||
                [...document.querySelectorAll('a')]
                  .find(el => /\/go\/live\//i.test(el.href));
      return a ? a.href : null;
    }, { polling: 'mutation', timeout: timeoutMs });

    const liveLink = await linkHandle.jsonValue();

    if (!liveLink) throw new Error('Link /go/live/ não encontrado');
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* teste local ------------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`)
  registrarNoWebinar().then(console.log).catch(console.error);
