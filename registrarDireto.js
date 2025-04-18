import axios from 'axios';
import { JSDOM } from 'jsdom';

export async function registrarDireto(nome, email) {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
  // 1) Baixa a página e executa o JS mínimo via JSDOM
  const { data: html } = await axios.get(REG_URL);
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  // 2) Pega o csrf-token do <meta>
  const csrfToken = dom.window.document
    .querySelector('meta[name="csrf-token"]')
    ?.content;
  if (!csrfToken) throw new Error('CSRF token não encontrado');

  // 3) Pega o objeto config injetado pelo JS
  const cfg = dom.window.config;
  if (!cfg || !cfg.hash) throw new Error('config JS não encontrado');

  // 4) Monta o payload idêntico ao XHR original
  const payload = {
    first_name: nome,
    email,
    phone: '',
    country: '',
    customQuestions: {},
    tags: [],
    hash: cfg.hash,
    webinar_id: cfg.webinarId,
    timezone: '-03:00',
    tw: cfg.tw
  };

  // 5) Envia o POST direto
  const { data } = await axios.post(
    'https://event.webinarjam.com/webinar/webinar_registrant.php',
    payload,
    {
      headers: {
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://event.webinarjam.com',
        Referer: REG_URL
      }
    }
  );

  if (!data.live_room_link) throw new Error('live_room_link não veio');
  return data.live_room_link;
}
