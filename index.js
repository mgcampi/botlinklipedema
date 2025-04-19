const express = require('express');
const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const app = express();
const port = process.env.PORT || 8080;

app.get('/inscrever', async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Informe nome e email' });
  }

  try {
    const cookieJar = new tough.CookieJar();
    const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));

    // 1. Acessa página de registro (pega cookies)
    await client.get('https://event.webinarjam.com/register/2/116pqiy');

    // 2. Envia inscrição
    const payload = {
      schedule_id: 7,
      event_id: 0,
      event_ts: 1745153100,
      first_name: nome,
      email: email,
      timezone: 26,
      token: "0.tKty25SJY_isF4TZIrPSALTgJ9YcuVSFXMsxP1gh3zUYG7PT3hPOtPqx0_WA6995EIpyt29EvhwjdsM_3bcz3IP6edd7P9UN16fgL7ncvxKP366pIe8z1SaMCAivD6OJzSPddyH5freRgQZHPxv98Fy0gJvf_mDCxYKsd5ujiegyzTUYZJeetEcE_7M0WaqvlPflfvrjhrGkL0cGMClRBwMRU9EezM3yZHpCN6cBxybrEPPVKzi_gFtUp5ChHINxmTJUKiq7epRCPUssNcqZ9J1ioILFof47MmF5G-_cD9_OPIljibsZBfOlwBYYae7bpuredgP_QIr_sfCWmz3b6kX53TEeQjcIVfU6pCwV99vS1Hhzrp9g_dkUEZcDUnOfhmfA7mNTJ5QdbSOatuNt-f1OzAx6i6pZAenvVg1wDZwIhcEePW9NPxMZZoGNI_iUwxXOM4yKRKq4kLBLqioCdLcxDWxnX7XmyJOO15G6GExx6MXP3czbh35vgWKSfEMmORUEMesM8A3bjNaZQLlWTxb30dbSb32aaCO1T5T2yuMqiI1Udj90GlWmiq0h6qBXTmADuqgp0oMIfxiHFquzkTZxeA_rzXg-ZqdlNH8YgLafg61QbZ_IRWu20Y8LunlP5A-Fx1u6kY9vlpD3CzTR67Rhh0syWVFWSSodddKoxLkC6ft3blA4-9bitnkJBM7YwL-zGoZyANusTq7zpb4VfHsgphyK-Yf79j0XsmPutUkbbRB_uO1EIkG_WRDtKC48-zyzmEqrp11N8w2f4r8xTonHYho8WjrAugVtrX-GH34a_n8FZ2WYteqOENF96rTJS9CKltvwjcHrycjMgtrHh_uqJWZ6ksjCCZmzrvfTAolYQnpcLGto7kMTPv83-w5wT5XFZ1swnwKj7UC22tBppA.h4EtGTL1FexiVdTrKQl1jw.b8d1db473d4e7a08eab1daf0e6f92435adcf565ee15db15aaa82edb417c93475"
    };

    await client.post(
      'https://event.webinarjam.com/register/116pqiy/process',
      payload,
      {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
          'Content-Type': 'application/json',
        }
      }
    );

    // 3. Carrega novamente a página de confirmação
    const confirmPage = await client.get('https://event.webinarjam.com/register/2/116pqiy');
    const html = confirmPage.data;

    // 4. Extrai o link da live
    const match = html.match(/https:\/\/event\.webinarjam\.com\/go\/live\/[^\s"'<>]+/);
    const link = match ? match[0] : null;

    if (!link) throw new Error("❌ Link da apresentação não encontrado");

    return res.json({ success: true, link });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Rodando na porta ${port}`);
});
