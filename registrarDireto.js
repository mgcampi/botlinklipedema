import axios from 'axios';
import { JSDOM } from 'jsdom';

/**
 * Faz a inscrição no WebinarJam enviando o XHR direto
 * e retorna o live_room_link em ~2 s.
 */
export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';

  // 1) Baixa a página e executa o JS mínimo para popular window.config e meta
  const { data: html } = await axios.get(REG_URL, { timeout: 30000 });
  const dom = new JSDOM(html, { runScripts: 'dangerously' });

  // 2) Extrai o CSRF token do <meta>
  const csrfMeta = dom.window.document.querySelector('meta[name="csrf-token"]');
  const csrfToken = csrfMeta?.content;
  if (!csrfToken) throw new Error('CSRF token não encontrado');

  // 3) Lê o objeto config que foi injetado pelo script da página
  const cfg = dom.window.config;
  if (!cfg || !cfg.hash) throw new Error('Objeto config não encontrado');

  // 4) Monta o payload exatamente como o XHR original
  const payload = {
    first_name: nome,
    email: email,
    phone: '',
    country: '',
    customQuestions: {},
    tags: [],
    hash: cfg.hash,           // ex.: "116pqiy"
    webinar_id: cfg.webinarId, // ex.: 2
    timezone: '-03:00',
    tw: cfg.tw                // ex.: 2
  };

  // 5) Envia o POST direto e recupera a resposta JSON
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

  // 6) Garante que o link é absoluto
  let link = data.live_room_link;
  if (link.startsWith('/')) {
    link = `https://event.webinarjam.com${link}`;
  }

  return link;
}
