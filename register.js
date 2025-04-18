// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function registrarNoWebinar(
  nome  = 'Automação Teste',
  email = `teste${Date.now()}@mail.com`
) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    /* 0) abre a tela de registro */
    await page.goto('https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 });

    /* 1) clica em REGISTRO */
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
    console.log('✅ REGISTRO clicado');

    /* 2) aguarda inputs */
    let inputs;
    for (let t = 0; t < 60 && !inputs; t++) {
      for (const f of page.frames()) {
        try {
          const ins = await f.$$('input');
          if (ins.length >= 2) { inputs = ins; break; }
        } catch (_) {}
      }
      if (!inputs) await sleep(500);
    }
    if (!inputs) throw new Error('Inputs não encontrados');
    await inputs[0].type(nome);  await inputs[1].type(email);
    console.log('✍️ dados preenchidos');

    /* 3) envia */
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
    console.log('🚀 enviado');

    /* 4) espera reload do mesmo URL */
    const start = Date.now();
    await page.waitForFunction(
      s => performance.now() > s && document.readyState === 'complete',
      { timeout: 60000 }, await page.evaluate(() => performance.now())
    );

    /* 5) varre todos os frames por 90 s até achar a 1ª URL /go/live/ */
    const deadline = Date.now() + 90000;
    let liveLink = null;
    while (Date.now() < deadline && !liveLink) {
      for (const f of page.frames()) {
        try {
          const html = await f.content();            // DOM completo
          const m = html.match(/https:\/\/[^"' ]+\/go\/live\/[^"' ]+/i);
          if (m) { liveLink = m[0]; break; }
        } catch (_) {}
      }
      if (!liveLink) await sleep(1000);
    }
    if (!liveLink) throw new Error('URL /go/live/ não encontrada');
    console.log('🔗 link:', liveLink);
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* teste stand‑alone */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
