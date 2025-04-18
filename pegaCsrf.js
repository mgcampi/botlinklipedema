// pegaCsrf.js
import axios from 'axios';

export async function pegaCsrf() {
  const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
  const res = await axios.get(REG_URL, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' },
    maxRedirects: 0,
    validateStatus: () => true
  });
  const cookies = res.headers['set-cookie'];
  if (!cookies) throw new Error('Nenhum Set-Cookie recebido');
  const xsrf = cookies.find(c => c.startsWith('XSRF-TOKEN='));
  if (!xsrf) throw new Error('XSRF-TOKEN não encontrado');
  return xsrf.split(';')[0].split('=')[1];
}
