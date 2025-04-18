// registrarDireto.js
import axios from 'axios';

/**
 * Realiza a inscrição no WebinarJam via XHR direto,
 * extraindo CSRF token e config do HTML estático via regex.
 */
export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) Baixa o HTML da página de registro
  const { data: html } = await axios.get(REG_URL, { timeout: 30000 });

  // 2) Extrai CSRF token do <meta>
  const csrfMatch = html.match(
    /<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i
  );
  if (!csrfMatch) throw new Error('CSRF token não encontrado');
  const csrfToken = csrfMatch[1];

  // 3) Extrai o objeto config injetado via JavaScript
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
        Referer: REG_URL
      },
      timeout: 30000
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
