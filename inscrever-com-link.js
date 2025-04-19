const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

const NOME = 'Mauricio';
const EMAIL = '1112223@gmail.com';

const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
const POST_URL = 'https://event.webinarjam.com/register/116pqiy/process';
const THANK_YOU_URL = 'https://event.webinarjam.com/register/2/116pqiy/thank-you';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

(async () => {
  try {
    // 1. Visita a página para capturar cookies e script
    const page = await client.get(REG_URL, {
      headers: { 'User-Agent': USER_AGENT }
    });

    // 2. Extrai WJ_DATA com os parâmetros necessários
    const match = page.data.match(/WJ_DATA = ({.*});/);
    if (!match) throw new Error('❌ Dados WJ_DATA não encontrados.');
    const data = JSON.parse(match[1]);

    const schedule = data.schedule[0];
    const token = data.registration.token;

    // 3. Extrai o token CSRF
    const cookies = await jar.getCookies(POST_URL);
    const csrfToken = cookies.find(c => c.key === 'XSRF-TOKEN')?.value;
    if (!csrfToken) throw new Error('❌ Token CSRF não encontrado nos cookies.');

    // 4. Monta o payload da inscrição
    const payload = {
      schedule_id: schedule.id,
      event_id: 0,
      event_ts: schedule.ts,
      first_name: NOME,
      email: EMAIL,
      timezone: 26,
      token: token
    };

    // 5. Envia o POST para inscrição
    const result = await client.post(POST_URL, payload, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'x-csrf-token': decodeURIComponent(csrfToken),
        'x-xsrf-token': decodeURIComponent(csrfToken),
        'x-requested-with': 'XMLHttpRequest',
        'origin': 'https://event.webinarjam.com',
        'referer': REG_URL,
        'User-Agent': USER_AGENT
      }
    });

    if (result.status !== 200) throw new Error('❌ Falha no envio do formulário');

    // 6. Acessa a página de confirmação
    const confirmPage = await client.get(THANK_YOU_URL, {
      headers: { 'User-Agent': USER_AGENT }
    });

    // 7. Usa cheerio para extrair o link da live
    const $ = cheerio.load(confirmPage.data);
    const link = $('a[href*="/go/live/"]').attr('href');

    if (!link) throw new Error('❌ Link da live não encontrado na página de confirmação.');

    console.log('✅ Inscrição realizada com sucesso!');
    console.log('🔗 Link da live:', link);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
})();
