// 🔧 Arquivo: inscricaoWebinar.js
import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const { nome, email } = req.body;
  console.log("📩 Nova tentativa de inscrição recebida:", nome, email);

  try {
    const ts = Math.floor(Date.now() / 1000);
    const urlForm = `https://event.webinarjam.com/register/2/116pqiy/form-embed?ts=${ts}&offset=-180&registrationPageTemplateId=30&formBgColor=%23FFFFFF&formBgOpacity=0&formAccentColor=%2357D6B0&formAccentOpacity=1&formButtonText=Registro&allowRedirect=true`;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      Referer: "https://event.webinarjam.com/register/2/116pqiy",
      Origin: "https://event.webinarjam.com",
    };

    // 🔍 Busca HTML da página de confirmação com o link final
    const response = await axios.post(
      "https://event.webinarjam.com/register/116pqiy/process",
      {
        schedule_id: 7,
        event_id: 0,
        event_ts: 1745153100,
        first_name: nome,
        email: email,
        timezone: 26,
      },
      { headers }
    );

    const html = response.data;
    fs.writeFileSync("debug.html", html); // 💾 salva pra debug

    // 💡 Cheerio parse (fallback pro regex antigo)
    const $ = cheerio.load(html);
    let link = null;

    // 1) âncora com id "js_live_link_X"
    const byId = $('a[id^="js_live_link_"]').attr("href");
    if (byId) link = byId;

    // 2) qualquer <a> com href contendo "/go/live/"
    if (!link) {
      $('a').each((_, el) => {
        const href = $(el).attr("href");
        if (href && /\/go\/live\//i.test(href)) link = href;
      });
    }

    // 3) elemento com data-widget-key="liveLink"
    if (!link) {
      const widget = $('[data-widget-key="liveLink"]').text().trim();
      if (widget) link = widget;
    }

    if (!link) {
      console.error("❌ Link final não encontrado no HTML");
      return res.status(500).json({ erro: "Não foi possível extrair o link de acesso." });
    }

    console.log("✅ Link final encontrado:", link);
    return res.json({ sucesso: true, link });
  } catch (err) {
    console.error("❌ Erro na inscrição:", err);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
