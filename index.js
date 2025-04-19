import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use("/debug", express.static("debug"));

app.post("/inscricao", async (req, res) => {
  const { nome, email } = req.body;
  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  try {
    const url = "https://event.webinarjam.com/register/2/116pqiy/form-embed";
    const response = await axios.get(url);
    const html = response.data;

    // Salva HTML de debug
    const fileName = `debug-${Date.now()}.html`;
    const filePath = path.join("debug", fileName);
    await fs.writeFile(filePath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    // Extrai o conteúdo do script com "var config = {...}"
    const $ = cheerio.load(html);
    const scriptTags = $("script");

    let configRaw = null;

    scriptTags.each((i, el) => {
      const content = $(el).html();
      if (content && content.includes("var config =")) {
        const match = content.match(/var config = (.*?);\s*var lang =/s);
        if (match && match[1]) {
          configRaw = match[1];
        }
      }
    });

    if (!configRaw) {
      console.error("❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`,
      });
    }

    const config = JSON.parse(configRaw);
    const schedule = config.webinar.registrationDates[0];

    const payload = {
      first_name: nome,
      email: email,
      schedule_id: schedule.schedule_id,
      event_id: schedule.event_id,
      hash: config.hash,
      country_code: config.lead.country_code,
    };

    const headers = {
      "Content-Type": "application/json",
      Referer: url,
    };

    const r = await axios.post(config.routes.process, payload, { headers });

    return res.json({
      status: "ok",
      message: "Inscrição realizada com sucesso!",
      link: r.data?.redirect_url || null,
    });
  } catch (e) {
    console.error("🚨 Erro na inscrição:", e.message);
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      debug_url: `/debug/${fileName}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
