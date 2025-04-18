// registrarDireto.js
import axios from 'axios';

/**
 * Inscreve no WebinarJam via XHR direto,
 * extraindo token CSRF do cookie e config dos <script> do HTML.
 */
export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) GET inicial para pegar cookie de CSRF e HTML com scripts
  const getRes = await axios.get(REG_URL, {
    timeout: 30000,
    validateStatus: () => true,
    withCredentials: true
  });

  // 2) Extrai token CSRF do cookie 'XSRF-TOKEN'
  const setCookie = getRes.headers['set-cookie'];
  if (!setCookie) throw new Error('Cookie XSRF-TOKEN não encontrado');
  const xsrfStr = setCookie.find(c => c.includes('XSRF-TOKEN='));
  if (!xsrfStr) throw new Error('XSRF-TOKEN não encontrado');
  const csrfToken = xsrfStr.split('XSRF-TOKEN=')[1].split(';')[0];

  // 3) Varre os <script> à procura de config = { … }
  const html = getRes.data;
  let configJson = null;
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRegex.exec(html))) {
    const content = m[1];
    const cfgMatch = content.match(/(?:var\s+config|window\.config)\s*=\s*(\{[\s\S]*?\});/i);
    if (cfgMatch) {
      configJson = cfgMatch[1];
      break;
    }
  }
  if (!configJson) throw new Error('Objeto config não encontrado');
  const cfg = JSON.parse(configJson);
  const { hash, webinarId, tw } = cfg;

  // 4) Monta payload idêntico ao XHR original
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

  // 5) Envia POST para registrar e obtém resposta JSON
  const postRes = await axios.post(
    'https://event.webinarjam.com/webinar/webinar_registrant.php',
    payload,
    {
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://event.webinarjam.com',
        Referer: REG_URL,
        Cookie: `XSRF-TOKEN=${csrfToken}`
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );
  const data = postRes.data;

  if (!data || !data.live_room_link) {
    throw new Error('live_room_link ausente na resposta');
  }

  // 6) Garante URL absoluta
  let link = data.live_room_link;
  if (link.startsWith('/')) {
    link = `https://event.webinarjam.com${link}`;
  }

  return link;
}
