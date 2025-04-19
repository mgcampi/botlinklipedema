const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const NOME = 'Mauricio';
const EMAIL = '1112223@gmail.com';
const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
const POST_URL = 'https://event.webinarjam.com/register/116pqiy/process';

(async () => {
  try {
    // 1. Visita a página para capturar os cookies
    const page = await client.get(REG_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      }
    });

    // 2. Extrai os dados do script window.WJ_DATA
    const WJ_DATA = page.data.match(/WJ_DATA = ({.*});/);
    if (!WJ_DATA) throw new Error('❌ Dados WJ_DATA não encontrados.');

    const parsed = JSON.parse(WJ_DATA[1]);
    const schedule = parsed.schedule[0];
    const token = parsed.registration.token;

    // 3. Extrai token CSRF dos cookies
    const cookies = await jar.getCookies(POST_URL);
    const csrfToken = cookies.find(c => c.key === 'XSRF-TOKEN')?.value;
    if (!csrfToken) throw new Error('❌ Token CSRF não encontrado nos cookies.');

    // 4. Monta payload
    const payload = {
      schedule_id: schedule.id,
      event_id: 0,
      event_ts: schedule.ts,
      first_name: NOME,
      email: EMAIL,
      timezone: 26,
      token: token
    };

    // 5. Faz o POST real
    const response = await client.post(POST_URL, payload, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'x-csrf-token': decodeURIComponent(csrfToken),
        'x-xsrf-token': decodeURIComponent(csrfToken),
        'x-requested-with': 'XMLHttpRequest',
        'origin': 'https://event.webinarjam.com',
        'referer': REG_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36'
      }
    });

    console.log('✅ Inscrição realizada com sucesso!');
    console.log('🔁 Status:', response.status);

  } catch (error) {
    console.error('❌ Erro na inscrição:', error.message);
  }
})();
