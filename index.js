const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const app = express();
const port = process.env.PORT || 8080;

const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
const POST_URL = 'https://event.webinarjam.com/register/116pqiy/process';
const THANK_YOU_URL = 'https://event.webinarjam.com/register/2/116pqiy/thank-you';

app.get('/inscrever', async (req, res) => {
  const nome = req.query.nome || 'Visitante';
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email obrigatório' });
  }

  try {
    const cookieJar = new tough.CookieJar();
    const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));

    // 1. Acessa a página de registro
    const page = await client.get(REG_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    // 2. Extrai WJ_DATA
    const match = page.data.match(/WJ_DATA = ({.*});/);
    if (!match) throw new Error('❌ WJ_DATA não encontrado no HTML');

    const WJ_DATA = JSON.parse(match[1]);
    const schedule = WJ_DATA.schedule?.[0];
    const token = WJ_DATA.registration?.token;

    if (!schedule || !token) {
      throw new Error('❌ schedule_id, event_ts ou token ausentes');
    }

    // 3. Pega CSRF dos cookies
    const cookies = await cookieJar.getCookies(REG_URL);
    const xsrfCookie = cookies.find(c => c.key === 'XSRF-TOKEN');
    const csrf = xsrfCookie?.value;

    if (!csrf) throw new Error('❌ Cookie XSRF-TOKEN não encontrado');

    // 4. Faz o POST com os dados extraídos
    await client.post(POST_URL, {
      schedule_id: schedule.id,
      event_id: 0,
      event_ts: schedule.ts,
      first_name: nome,
      email: email,
      timezone: 26,
      token: token
    }, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'x-csrf-token': decodeURIComponent(csrf),
        'x-xsrf-token': decodeURIComponent(csrf),
        'x-requested-with': 'XMLHttpRequest',
        'origin': 'https://event.webinarjam.com',
        'referer': REG_URL,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // 5. Acessa a página de agradecimento
    const confirmPage = await client.get(THANK_YOU_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(confirmPage.data);
    const link = $('a[href*="/go/live/"]').attr('href');

    if (!link) throw new Error('❌ Link da live não encontrado na página de agradecimento');

    return res.json({
      success: true,
      nome,
      email,
      link
    });

  } catch (err) {
    console.error('Erro na automação:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.get('/', (req, res) => {
  res.send('🔥 API do WebinarJam no ar!');
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
