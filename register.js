// register.js — varredura de frames até achar /go/live/
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(
  nome  = 'Automação Teste',
  email = `teste${Date.now()}@mail.com`,
  timeoutMs = 120000          // 2 min máximos
) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 });

    /* 1) clica em REGISTRO -------------------------------------------- */
    for (const f of page.frames()) {
      try {
        const ok = await f.evaluate(() => {
          const el = Array.from(document.querySelectorAll('button,a'))
            .find(e => /registro/i.test(e.textContent));
          if (el) { el.scrollIntoView(); el.click(); return true; }
          return false;
        });
        if (ok) break;
      } catch (_) {}
    }

    /* 2) preenche nome e email ---------------------------------------- */
    let campos;
    const inDeadline = Date.now() + 20000;
    while (Date.now() < inDeadline && !campos) {
      for (const f of page.frames()) {
        try {
          const ins = await f.$$('input');
          if (ins.length >= 2) { campos = ins; break; }
        } catch (_) {}
      }
      if (!campos) await sleep(300);
    }
    if (!campos) throw new Error('Inputs não encontrados');
    await campos[0].type(nome);
    await campos[1].type(email);

    /* 3) envia --------------------------------------------------------- */
    for (const f of page.frames()) {
      try {
        const ok = await f.evaluate(() => {
          let b = document.querySelector('#register_btn');
          if (b) { b.removeAttribute('disabled'); b.click(); return true; }
          b = document.querySelector(
            'button[type="submit"],input[type="submit"],button.js-submit');
          if (b) { b.click(); return true; }
          return false;
        });
        if (ok) break;
      } catch (_) {}
    }

    /* 4) varre frames até achar /go/live/ ------------------------------ */
    const deadline = Date.now() + timeoutMs;
    let liveLink = null;
    while (Date.now() < deadline && !liveLink) {
      for (const f of page.frames()) {
        try {
          // 4a) anchor com id js_live_link_
          liveLink = await f.evaluate(() => {
            const a = document.querySelector('a[id^="js_live_link_"]');
            return a ? a.href : null;
          });
          if (liveLink) break;

          // 4b) regex no HTML inteiro
          const html = await f.content();
          const m = html.match(/https:\/\/[^"' ]+\/go\/live\/[^"' ]+/i);
          if (m) { liveLink = m[0]; break; }
        } catch (_) {}
      }
      if (!liveLink) await sleep(500);
    }

    if (!liveLink)
      throw new Error('Não encontrei URL /go/live/ em até 2 min.');
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* teste local ----------------------------------------------------------- */
if (import.meta.url === `file://${process.argv[1]}`)
  registrarNoWebinar().then(console.log).catch(console.error);
