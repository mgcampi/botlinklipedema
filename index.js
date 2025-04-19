import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Cria a pasta de debug se não existir
const debugDir = path.join(__dirname, "debugs");
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir);
}

// ✅ Serve arquivos estáticos da pasta /debugs
app.use("/debug", express.static(debugDir));
app.use(express.json());

app.get("/", (_, res) => res.send("Bot do WebinarJam rodando!"));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  try {
    const urlFormulario = "https://event.webinarjam.com/register/2/116pqiy";
    const response = await axios.get(urlFormulario, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const html = response.data;
    const debugFilename = `debug-${Date.now()}.html`;
    const debugPath = path.join(debugDir, debugFilename);
    fs.writeFileSync(debugPath, html);
    console.log(`💾 HTML salvo como ${debugFilename}`);

    const $ = cheerio.load(html);
    const scripts = $("script");

    let configJSON = null;

    scripts.each((_, script) => {
      const content = $(script).html();
      if (content && content.includes("var config = {")) {
        const match = content.match(/var config = ({[\s\S]+?});/);
        if (match && match[1]) {
          configJSON = JSON.parse(match[1]);
        }
      }
    });

    if (!configJSON) {
      console.error("❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${debugFilename}`
      });
    }

    const schedule = configJSON.webinar.registrationDates[0];
    const timezone = configJSON.webinar.timezones["25"].id;

    const payload = {
      schedule_id: schedule.schedule_id,
      event_id: schedule.event_id,
      event_ts: schedule.ts,
      first_name: nome,
      email,
      timezone,
    };

    const urlInscricao = configJSON.routes.process;
    const resposta = await axios.post(urlInscricao, payload);

    const redirectUrl = resposta.data?.url;

    if (redirectUrl) {
      console.log("✅ Inscrição feita com sucesso!");
      return res.json({ sucesso: true, link: redirectUrl });
    } else {
      console.warn("❌ Resposta sem link de redirecionamento");
      return res.status(500).json({ erro: "Erro ao inscrever." });
    }
  } catch (erro) {
    console.error("🚨 Erro na inscrição:", erro.message || erro);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
