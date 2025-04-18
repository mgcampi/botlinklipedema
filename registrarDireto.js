// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(nome = 'Automação Teste', email = `teste${Date.now()}@mail.com`) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', { waitUntil: 'networkidle2', timeout: 60000 });

    // 1) clica em REGISTRO
    for (const f of page.frames()) {
      const clicked = await f.evaluate(() => {
        const el = Array.from(document.querySelectorAll('button,a'))
          .find(e => /registro/i.test(e.textContent));
        if (el) { el.scrollIntoView(); el.click(); return true; }
        return false;
      }).catch(() => false);
      if (clicked) break;
    }

    // 2) preenche nome e email
    let inputs;
    for (let i = 0; i < 40 && !inputs; i++) {
      for (const f of page.frames()) {
        const ins = await f.$$('input').catch(() => []);
        if (ins.length >= 2) { inputs = ins; break; }
      }
      if (!inputs) await sleep(250);
    }
    if (!inputs) throw new Error('Inputs não encontrados');
    await inputs[0].type(nome, { delay: 30 });
    await inputs[1].type(email, { delay: 30 });

    // 3) envia formulário
    for (const f of page.frames()) {
      const sent = await f.evaluate(() => {
        const btn = document.querySelector('#register_btn') || document.querySelector('button.js-submit') || document.querySelector('button[type="submit"],input[type="submit"]');
        if (!btn) return false;
        btn.removeAttribute('disabled');
        btn.scrollIntoView();
        btn.click();
        return true;
      }).catch(() => false);
      if (sent) break;
    }

    // 4) espera o thank-you (URL ou texto)
    await page.waitForFunction(
      () => /thank-you/.test(location.pathname) || document.querySelector('a[id^="js_live_link_"]'),
      { timeout: 90000 }
    );

    // 5) captura o link em qualquer frame
    let liveLink = page.url().match(/go\/live\/\S+/) ? page.url() : null;
    if (!liveLink) {
      for (const f of page.frames()) {
        liveLink = await f.evaluate(() => {
          const a = document.querySelector('a[id^="js_live_link_"]') ||
                    Array.from(document.querySelectorAll('a')).find(x => /\/go\/live\//.test(x.href));
          return a ? a.href : null;
        }).catch(() => null);
        if (liveLink) break;
      }
    }
    if (!liveLink) throw new Error('Link da sala não encontrado');

    return liveLink;
  } finally {
    await browser.close();
  }
}

/* teste local */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
