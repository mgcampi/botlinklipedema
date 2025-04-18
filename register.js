// register.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

/* Pausa genérica ---------------------------------------------------------- */
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

    /* -------- abre página de registro ----------------------------------- */
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* -------- 1) clica no botão REGISTRO -------------------------------- */
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

    /* -------- 2) espera inputs aparecerem (até 30 s) -------------------- */
    async function waitInputs() {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        for (const f of page.frames()) {
          try {
            const inputs = await f.$$('input');
            if (inputs.length >= 2) return { frame: f, inputs };
          } catch (_) {}
        }
        await sleep(500);
      }
      throw new Error('Campos de nome ou email não encontrados');
    }

    const { inputs } = await waitInputs();
    await inputs[0].type(nome,  { delay: 25 });
    await inputs[1].type(email, { delay: 25 });
    console.log('✍️  Nome e e‑mail preenchidos');

    await sleep(800); /* pequena pausa pro WebinarJam estabilizar */

    /* -------- 3) envia o formulário ------------------------------------- */
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

    /* -------- 4) aguarda redireção / carregamento da tela final --------- */
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      .catch(() => { /* às vezes não navega, só troca DOM */ });

    /* -------- 5) captura o link js_live_link_* -------------------------- */
    let liveLink = null;

    for (const f of page.frames()) {
      try {
        const href = await f.evaluate(() => {
          const a = document.querySelector('a[id^="js_live_link_"]');
          return a ? a.href : null;
        });
        if (href) { liveLink = href; break; }
      } catch (_) {}
    }

    if (!liveLink) throw new Error('Link js_live_link_ não encontrado');
    console.log('🔗 Link capturado:', liveLink);
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* ------------ teste stand‑alone ----------------------------------------- */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
