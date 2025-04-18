// registrarDireto.js
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

export async function registrarDireto(nome, email) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://event.webinarjam.com/register/2/116pqiy', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 1) espera o objeto `config` ser injetado
    await page.waitForFunction(() => window.config && window.config.hash, { timeout: 20000 });
    const config = await page.evaluate(() => window.config);
    const { hash, webinarId, tw } = config;

    // 2) extrai o cookie XSRF-TOKEN
    const cookies = await page.cookies();
    const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
    if (!xsrfCookie) throw new Error('XSRF-TOKEN não encontrado');
    const xsrf = xsrfCookie.value;

    // 3) monta o payload
    const payload = {
      first_name: nome,
      email: email,
      phone: '',
      country: '',
      customQuestions: {},
      tags: [],
      hash: hash,
      webinar_id: webinarId,
      timezone: '-03:00',
      tw: tw
    };

    // 4) executa o POST de inscrição dentro do contexto da página
    const result = await page.evaluate(async (data, token) => {
      const res = await fetch('/webinar/webinar_registrant.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    }, payload, xsrf);

    if (!result.live_room_link) {
      throw new Error('live_room_link ausente na resposta');
    }

    // 5) retorna link absoluto
    let link = result.live_room_link;
    if (link.startsWith('/')) {
      link = `https://event.webinarjam.com${link}`;
    }
    return link;
  } finally {
    await browser.close();
  }
}
