import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());

// __dirname para ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const debugDir = path.join(__dirname, "debug");

// Rota para inscrição
app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios" });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const url = "https://event.webinarjam.com/register/2/116pqiy";
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const timestamp = Date.now();
    const htmlFileName = `debug-${timestamp}.html`;
    const scriptsFileName = `scripts-${timestamp}.txt`;

    await fs.mkdir(debugDir, { recursive: true });
    await fs.writeFile(path.join(debugDir, htmlFileName), html, "utf-8");

    const inlineScripts = $("script:not([src])")
      .map((_, el) => $(el).html())
      .get()
      .join("\n\n=== SCRIPT ===\n\n");

    await fs.writeFile(path.join(debugDir, scriptsFileName), inlineScripts, "utf-8");

    console.log(`💾 HTML salvo como ${htmlFileName}`);
    console.log(`📜 Scripts dump salvo como ${scriptsFileName}`);

    // Tenta achar o trecho com "var config = {"
    const configRegex = /var\s+config\s*=\s*(\{[\s\S]+?\});/;
    const match = html.match(configRegex);
    if (!match) {
      console.error("🚨 Erro na inscrição: ❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${htmlFileName}`,
        scripts_dump: `/debug/${scriptsFileName}`,
      });
    }

    const config = eval("(" + match[1] + ")");

    const payload = {
      name: nome,
      email,
      schedule_id: config.webinar.registrationDates[0].schedule_id,
      event_id: config.webinar.registrationDates[0].event_id,
      hash: config.hash,
      ts: config.webinar.registrationDates[0].ts,
      captcha: "",
      country_code: "BR",
      timezone: "America/Sao_Paulo",
    };

    const postUrl = config.routes.process;
    const headers = {
      "Content-Type": "application/json",
      Referer: url,
    };

    const resposta = await axios.post(postUrl, payload, { headers });
    const link = resposta.data?.data?.link;

    if (link) {
      console.log("✅ Inscrição feita com sucesso!");
      return res.json({ sucesso: true, link });
    } else {
      console.error("🚨 Erro: resposta inesperada", resposta.data);
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${htmlFileName}`,
        scripts_dump: `/debug/${scriptsFileName}`,
      });
    }
  } catch (err) {
    console.error("❌ Erro detalhado:", err.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

// Servir arquivos da pasta debug
app.use("/debug", express.static(path.join(__dirname, "debug")));

// Teste de ping
app.get("/ping", (_, res) => res.send("pong"));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
