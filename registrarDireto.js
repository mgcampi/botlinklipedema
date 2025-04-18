import axios from 'axios';
import { JSDOM } from 'jsdom';

export async function registrarDireto(nome, email) {
  // 1) GET inicial pra pegar CSRF e config
  const pageResp = await axios.get(
    'https://event.webinarjam.com/register/2/116pqiy',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const html = pageResp.data;

  // extrai token CSRF
  const dom = new JSDOM(html);
  const meta = dom.window.document.querySelector('meta[name="csrf-token"]');
  if (!meta) throw new Error('CSRF token não encontrado');
  const csrfToken = meta.getAttribute('content');

  // extrai o objeto config
  const m = html.match(/var\s+config\s*=\s*(\{[\s\S]*?\});/i);
  if (!m) throw new Error('Objeto config não encontrado');
  const { hash, webinarId, tw } = JSON.parse(m[1]);

  // 2) POST pra registrar
  const params = new URLSearchParams({
    first_name: nome,
    email: email,
    phone: '',
    country: '',
    customQuestions: '{}',
    tags: '[]',
    hash,
    webinar_id: webinarId,
    timezone: '-03:00',
    tw: String(tw)
  });

  const postResp = await axios.post(
    'https://event.webinarjam.com/webinar/webinar_registrant.php',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://event.webinarjam.com',
        Referer: 'https://event.webinarjam.com/register/2/116pqiy'
      }
    }
  );

  if (!postResp.data.live_room_link) {
    throw new Error('Link de apresentação não retornado');
  }

  return postResp.data.live_room_link;
}
