import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🟢 Serve arquivos HTML da pasta debug:
app.use("/debug", express.static(path.join(__dirname, "debug")));

app.use(bodyParser.json());

app.get("/", (_, res) => {
  res.send("🚀 Servidor rodando na porta " + PORT);
});

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  console.log("➡️ Iniciando inscrição para:", nome, email);

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    const response = await axios.get("https://event.webinarjam.com/register/2/116pqiy");
    const html = response.data;

    const timestamp = Date.now();
    const debugPath = path.join(__dirname, "debug");

    if (!fs.existsSync(debugPath)) fs.mkdirSync(debugPath);

    const filename = `debug-${timestamp}.html`;
    const filepath = path.join(debugPath, filename);

    fs.writeFileSync(filepath, html);
    console.log(`💾 HTML salvo como ${filename}`);

    const match = html.match(/var config = ({[\s\S]*?});\s*var lang =/);
    if (!match) {
      console.error("🚨 Erro na inscrição: ❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${filename}`
      });
    }

    const config = JSON.parse(match[1]);
    const schedule = config.webinar.registrationDates[0];

    const payload = {
      schedule_id: schedule.schedule_id,
      event_id: schedule.event_id,
      event_ts: schedule.ts,
      first_name: nome,
      email: email,
      timezone: 26
    };

    const result = await axios.post(config.routes.process, payload);
    const link = result.data?.url;

    if (!link) {
      return res.status(500).json({
        erro: "Inscrição falhou. Link não gerado.",
        debug_url: `/debug/${filename}`
      });
    }

    return res.json({ sucesso: true, link });
  } catch (err) {
    console.error("❌ Erro na inscrição:", err.message);
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      debug_url: `/debug/${filename}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
