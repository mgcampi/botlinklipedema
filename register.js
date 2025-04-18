// register.js  – compatível com Puppeteer v4 e botão #register_btn
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

    /* 0) abre a página --------------------------------------------------- */
    await page.goto(
      'https://event.webinarjam.com/register/2/116pqiy',
      { waitUntil: 'networkidle2', timeout: 60000 }
    );

    /* 1) CLICA NO “REGISTRO” -------------------------------------------- */
    let clicked = false;
    for (const f of page.frames()) {
      try {
        clicked = await f.evaluate(() => {
          const el = Array.from(document.querySelectorAll('button,a'))
            .find(e => /registro/i.test(e.textContent));
          if (el) { el.scrollIntoView(); el.click(); return true; }
          return false;
        });
      } catch (_) {}
      if (clicked) break;
    }
    if (!clicked) throw new Error('Botão REGISTRO não encontrado');

    /* 2) ESPERA inputs aparecerem -------------------------------------- */
    let nomeInput, emailInput;
    const inDeadline = Date.now() + 20000;
    while (Date.now() < inDeadline && !(nomeInput && emailInput)) {
      for (const f of page.frames()) {
        try {
          const ins = await f.$$('input');
          if (ins.length >= 2) { [nomeInput, emailInput] = ins; break; }
        } catch (_) {}
      }
      if (!(nomeInput && emailInput)) await sleep(300);
    }
    if (!(nomeInput && emailInput)) throw new Error('Inputs não encontrados');

    await nomeInput.type(nome);
    await emailInput.type(email);

    /* 3) ENVIA formulário ----------------------------------------------- */
    let enviado = false;
    for (const f of page.frames()) {
      try {
        enviado = await f.evaluate(() => {
          // (a) tenta botão padrão do WebinarJam
          let btn = document.querySelector('#register_btn');
          if (btn) {
            btn.removeAttribute('disabled');
            btn.click();
            return true;
          }
          // (b) fallback genérico
          btn = document.querySelector(
            'button[type="submit"],input[type="submit"],button.js-submit'
          );
          if (btn) { btn.click(); return true; }
          return false;
        });
      } catch (_) {}
      if (enviado) break;
    }
    if (!enviado) throw new Error('Botão de envio não encontrado');

    /* 4) ESPERA URL virar /registration/thank-you/ ---------------------- */
    await page.waitForFunction(
      () => /\/registration\/thank-you\//.test(location.pathname),
      { timeout: 90000 }
    );

    /* 5) ESPERA anchor js_live_link_ aparecer --------------------------- */
    let link = null;
    const linkDeadline = Date.now() + 90000;
    while (Date.now() < linkDeadline && !link) {
      link = await page.evaluate(() => {
        const a = document.querySelector('a[id^="js_live_link_"]');
        return a ? a.href : null;
      });
      if (!link) await sleep(500);
    }
    if (!link) throw new Error('Link js_live_link_ não encontrado');

    return link;

  } finally {
    await browser.close();
  }
}

/* teste local ------------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`)
  registrarNoWebinar().then(console.log).catch(console.error);
