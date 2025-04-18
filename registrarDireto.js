import axios from 'axios';

/**
 * Realiza a inscrição no WebinarJam via XHR direto,
 * extraindo token CSRF do cookie e config do HTML estático.
 */
export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) GET inicial para pegar cookie de CSRF e HTML com config
  const getRes = await axios.get(REG_URL, {
    timeout: 30000,
    // permita receber o header Set-Cookie
    validateStatus: () => true
  });

  // 2) Extrai token CSRF do cookie 'XSRF-TOKEN'
  const setCookieHeader = getRes.headers['set-cookie'];
  if (!setCookieHeader) throw new Error('Cookie XSRF-TOKEN não encontrado');
  const xsrfCookie = setCookieHeader
    .find(c => c.startsWith('XSRF-TOKEN='));
  if (!xsrfCookie) throw new Error('XSRF-TOKEN não encontrado');
  const csrfToken = xsrfCookie.split(';')[0].split('=')[1];

  // 3) Extrai o objeto config injetado via JavaScript no HTML
  const html = getRes.data;
  const cfgMatch = html.match(/var\s+config\s*=\s*(\{[\s\S]*?\});/i);
  if (!cfgMatch) throw new Error('Objeto config não encontrado');
  const cfg = JSON.parse(cfgMatch[1]);
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

  // 5) Envia POST para registrar e obtém JSON de resposta
  const { data } = await axios.post(
    'https://event.webinarjam.com/webinar/webinar_registrant.php',
    payload,
    {
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://event.webinarjam.com',
        Referer: REG_URL,
        // enviar cookie XSRF-TOKEN de volta
        Cookie: `XSRF-TOKEN=${csrfToken}`
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

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
