const express = require('express');
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 8080;

const REG_URL = 'https://event.webinarjam.com/register/2/116pqiy';
const POST_URL = 'https://event.webinarjam.com/register/116pqiy/process';
const THANK_YOU_URL = 'https://event.webinarjam.com/register/2/116pqiy/thank-you';

app.get('/inscrever', async (req, res) => {
  const nome = req.query.nome || 'SemNome';
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email obrigatório' });
  }

  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  try {
    // 1. Visita a página pra pegar cookies + script
    const page = await client.get(REG_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const WJ = page.data.match(/WJ_DATA = ({.*});/);
    if (!WJ) throw new Error('WJ_DATA não encontrado');
    const data = JSON.parse(WJ[1]);

    const schedule = data.schedule[0];
    const token = data.registration.token;

    const cookies = await jar.getCookies(POST_URL);
    const csrf = cookies.find(c => c.key === 'XSRF-TOKEN')?.value;
    if (!csrf) throw new Error('Token CSRF não encontrado');

    // 2. Envia inscrição
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

    // 3. Pega a página de confirmação
    const confirm = await client.get(THANK_YOU_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(confirm.data);
    const link = $('a[href*="/go/live/"]').attr('href');

    if (!link) throw new Error('Link final não encontrado');

    return res.json({
      success: true,
      nome,
      email,
      link
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Servidor rodando na porta ${port}`);
});
