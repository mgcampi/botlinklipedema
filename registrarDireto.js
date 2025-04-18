// registrarDireto.js
import { pegaCsrf } from './pegaCsrf.js';
import axios from 'axios';

/**
 * Inscreve no WebinarJam via XHR direto,
 * usando o CSRF token pego pelo /debug/csrf.
 */
export async function registrarDireto(nome, email) {
  const registerUrl = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) pega CSRF token via utilitário de debug
  const csrfToken = await pegaCsrf();

  // 2) GET inicial para carregar o HTML e pegar config
  const getRes = await axios.get(registerUrl, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    validateStatus: () => true
  });
  const html = getRes.data;

  // 3) extrai o objeto config do JavaScript inline
  const cfgMatch = html.match(/var\s+config\s*=\s*(\{[\s\S]*?\});/i);
  if (!cfgMatch) throw new Error('Objeto config não encontrado');
  const { hash, webinarId, tw } = JSON.parse(cfgMatch[1]);

  // 4) monta o payload idêntico ao XHR original
  const params = new URLSearchParams({
    first_name: nome,
    email,
    phone: '',
    country: '',
    customQuestions: '{}',
    tags: '[]',
    hash,
    webinar_id: webinarId,
    timezone: '-03:00',
    tw: String(tw)
  });

  // 5) envia o POST de inscrição, com o header e cookie de CSRF
  const postRes = await axios.post(
    'https://event.webinarjam.com/webinar/webinar_registrant.php',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://event.webinarjam.com',
        Referer: registerUrl,
        Cookie: `XSRF-TOKEN=${csrfToken}`
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  // 6) valida e retorna o link absoluto
  const { live_room_link } = postRes.data;
  if (!live_room_link) {
    throw new Error('live_room_link ausente na resposta');
  }
  return live_room_link.startsWith('/')
    ? `https://event.webinarjam.com${live_room_link}`
    : live_room_link;
}
