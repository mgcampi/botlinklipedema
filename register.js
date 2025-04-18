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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* ---------- 1) Clica no botão REGISTRO ---------- */
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

    /* ---------- 2) Aguarda inputs (até 30 s) ---------- */
    async function waitInputs() {
      const start = Date.now();
      while (Date.now() - start < 30000) {
        for (const f of page.frames()) {
          try {
            const inputs = await f.$$('input');
            if (inputs.length >= 2) return { frame: f, inputs };
          } catch (_) {}
        }
        await page.waitForTimeout(500);
      }
      throw new Error('Campos de nome ou email não encontrados');
    }

    const { inputs } = await waitInputs();
    await inputs[0].type(nome,  { delay: 25 });
    await inputs[1].type(email, { delay: 25 });
    console.log('✍️  Nome e e‑mail preenchidos');

    /* pequena pausa para estabilidade */
    await page.waitForTimeout(1000);

    /* ---------- 3) Clica no submit (se existir) ---------- */
    let submitted = false;
    for (const f of page.frames()) {
      try {
        submitted = await f.evaluate(() => {
          const btn = document.querySelector(
            'button[type="submit"], input[type="submit"], button.js-submit'
          );
          if (btn) { btn.click(); return true; }
          return false;
        });
      } catch (_) {}
      if (submitted) break;
    }
    console.log('🚀 Formulário enviado (ou auto‑submit)');

    /* ---------- 4) Captura link final ---------- */
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    let liveLink = page.url();   // fallback

    for (const f of page.frames()) {
      try {
        const link = await f.evaluate(() => {
          const a = [...document.querySelectorAll('a')]
            .find(el =>
              /go-live|\/live\/|event\.webinarjam\.com\/t\//i.test(el.href) ||
              /Join|Entrar|Acessar/i.test(el.textContent)
            );
          return a ? a.href : null;
        });
        if (link) { liveLink = link; break; }
      } catch (_) {}
    }

    console.log('🔗 Link capturado:', liveLink);
    return liveLink;

  } finally {
    await browser.close();
  }
}

/* Teste stand‑alone: node register.js */
if (import.meta.url === `file://${process.argv[1]}`) {
  registrarNoWebinar().then(console.log).catch(console.error);
}
