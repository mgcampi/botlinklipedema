import axios from 'axios';
import { JSDOM } from 'jsdom';

/**
 * Faz a inscrição no WebinarJam enviando o mesmo XHR que o botão usa
 * e devolve o live_room_link em ~2s.
 */
export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) Baixa a página e executa scripts mínimos via JSDOM
  const { data: html } = await axios.get(REG_URL, { timeout: 30000 });
  const dom = new JSDOM(html, { runScripts: 'dangerously' });

  // 2) Pega o CSRF token do <meta>
  const csrfMeta = dom.window.document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfMeta?.content;
  if (!csrfToken) throw new Error('CSRF token não encontrado');

  // 3) Pega o objeto config injetado pelo script
  const cfg = dom.window.config;
  if (!cfg || !cfg.hash) throw new Error('Objeto config não encontrado');

  // 4) Monta o payload idêntico ao XHR original
  const payload = {
    first_name: nome,
    email: email,
    phone: '',
    country: '',
    customQuestions: {},
    tags: [],
    hash: cfg.hash,
    webinar_id: cfg.webinarId,
    timezone: '-03:00',
    tw: cfg.tw
  };

  // 5) Envia o POST direto e retorna o live_room_link
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

  // Garante URL absoluta
  let link = data.live_room_link;
  if (link.startsWith('/')) {
    link = `https://event.webinarjam.com${link}`;
  }

  return link;
}
