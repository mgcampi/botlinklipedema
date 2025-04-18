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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    /* 0) abre página de registro ---------------------------------------- */
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* 1) clica no botão REGISTRO --------------------------------------- */
    let clicked = false;
    for (const frame of page.frames()) {
      try {
        clicked = await frame.evaluate(() => {
          const el = [...document.querySelectorAll('button, a')]
            .find(e => /registro/i.test(e.textContent));
          if (el) { el.scrollIntoView({ block: 'center' }); el.click(); }
          return !!el;
        });
      } catch (_) {}
      if (clicked) break;
    }
    if (!clicked) throw new Error('Botão REGISTRO não encontrado');
    console.log('✅ Botão REGISTRO clicado');

    /* 2) espera inputs aparecerem -------------------------------------- */
    async function waitInputs() {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        for (const f of page.frames()) {
          try {
            const ins = await f.$$('input');
            if (ins.length >= 2) return ins;
          } catch (_) {}
        }
        await sleep(500);
      }
      throw new Error('Campos de nome ou email não encontrados');
    }

    const inputs = await waitInputs();
    await inputs[0].type(nome,  { delay: 25 });
    await inputs[1].type(email, { delay: 25 });
    console.log('✍️  Nome e e‑mail preenchidos');

    await sleep(700); // pequena pausa

    /* 3) envia ---------------------------------------------------------- */
    for (const f of page.frames()) {
      try {
        const ok = await f.evaluate(() => {
          const btn = document.querySelector(
            'button[type="submit"], input[type="submit"], button.js-submit'
          );
          if (btn) { btn.click(); return true; }
          return false;
        });
        if (ok) break;
      } catch (_) {}
    }
    console.log('🚀 Formulário enviado');

    /* 4) aguarda thank‑you page carregar -------------------------------- */
    await page.waitForNavigation(
      { waitUntil: 'networkidle2', timeout: 60000 }
    ).catch(() => {}); // se não navegar, seguimos

    /* 5) espera até 60 s pelo anchor js_live_link_ ---------------------- */
    await page.waitForSelector(
      'a[id^="js_live_link_"], a[href*="/go/live/"]',
      { timeout: 60000 }
    );

    /* 6) extrai o href -------------------------------------------------- */
    const liveLink = await page.evaluate(() => {
      const a = document.querySelector('a[id^="js_live_link_"]')
            || document.querySelector('a[href*="/go/live/"]');
      return a ? a.href : null;
    });

    if (!liveLink) throw new Error('Link /go/live/ não encontrado');
    console.log('🔗 Link capturado:', liveLink);
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* teste stand‑alone ------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
