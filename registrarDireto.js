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

    // Espera o objeto config ser carregado
    await page.waitForFunction(() => window.config && config.hash, { timeout: 20000 });
    const config = await page.evaluate(() => config);
    const { hash, webinarId, tw } = config;

    // Extrai cookie XSRF-TOKEN
    const cookies = await page.cookies();
    const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
    if (!xsrfCookie) throw new Error('XSRF-TOKEN não encontrado');
    const xsrf = xsrfCookie.value;

    // Monta payload para inscrição
    const payload = {
      first_name: nome,
      email,
      phone: '',
      country: '',
      customQuestions: {},
      tags: [],
      hash,
      webinar_id: webinarId,
      timezone: '-03:00',
      tw
    };

    // Envia inscrição usando fetch no contexto da página
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
      return res.json();
    }, payload, xsrf);

    if (!result.live_room_link) {
      throw new Error('live_room_link ausente na resposta');
    }

    let link = result.live_room_link;
    if (link.startsWith('/')) {
      link = `https://event.webinarjam.com${link}`;
    }
    return link;
  } finally {
    await browser.close();
  }
}
```js
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

    // 1) Espera objeto config no contexto da página
    await page.waitForFunction('window.config && config.hash', { timeout: 20000 });
    const config = await page.evaluate(() => config);
    const { hash, webinarId, tw } = config;

    // 2) Extrai cookie XSRF-TOKEN
    const cookies = await page.cookies();
    const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN')?.value;
    if (!xsrf) throw new Error('XSRF-TOKEN não encontrado');

    // 3) Monta payload conforme XHR do site
    const payload = {
      first_name: nome,
      email,
      phone: '',
      country: '',
      customQuestions: {},
      tags: [],
      hash,
      webinar_id: webinarId,
      timezone: '-03:00',
      tw
    };

    // 4) Envia inscrição usando fetch dentro da página
    const result = await page.evaluate(async (data, token) => {
      const response = await fetch('/webinar/webinar_registrant.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(data)
      });
      return response.json();
    }, payload, xsrf);

    if (!result.live_room_link) {
      throw new Error('live_room_link ausente na resposta');
    }
    let link = result.live_room_link;
    if (link.startsWith('/')) {
      link = `https://event.webinarjam.com${link}`;
    }

    return link;
  } finally {
    await browser.close();
  }
}
```js
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

    // espera o objeto config ser carregado no contexto da página
    await page.waitForFunction('window.config && config.hash', { timeout: 20000 });
    const config = await page.evaluate(() => config);
    const { hash, webinarId, tw } = config;

    // pega o cookie XSRF-TOKEN
    const cookies = await page.cookies();
    const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN')?.value;
    if (!xsrf) throw new Error('XSRF-TOKEN não encontrado');

    // monta payload conforme XHR original
    const payload = {
      first_name: nome,
      email,
      phone: '',
      country: '',
      customQuestions: {},
      tags: [],
      hash,
      webinar_id: webinarId,
      timezone: '-03:00',
      tw
    };

    // envia inscrição usando Fetch no contexto da página
    const result = await page.evaluate(async (payload, xsrf) => {
      const res = await fetch('/webinar/webinar_registrant.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': xsrf,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });
      return res.json();
    }, payload, xsrf);

    if (!result.live_room_link) {
      throw new Error('live_room_link ausente na resposta');
    }
    let link = result.live_room_link;
    if (link.startsWith('/')) {
      link = `https://event.webinarjam.com${link}`;
    }

    return link;
  } finally {
    await browser.close();
  }
}
