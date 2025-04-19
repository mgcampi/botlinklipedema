import express from "express";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;

// Setup necessário para __dirname funcionar com ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware pra interpretar JSON (mas a requisição será feita em urlencoded)
app.use(express.json());

// Cria pasta de debug se não existir
const debugPath = path.join(__dirname, "debug");
await fs.mkdir(debugPath, { recursive: true });

// Endpoint para testar se tá rodando
app.get("/", (_, res) => {
  res.send("🚀 Bot do WebinarJam no ar!");
});

// Endpoint principal de inscrição
app.post("/inscrever", async (req, res) => {
  const nome = req.body.nome;
  const email = req.body.email;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const response = await axios.get("https://event.webinarjam.com/register/116pqiy", {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = response.data;
    const timestamp = Date.now();
    const debugFileName = `debug-${timestamp}.html`;
    const debugFilePath = path.join(debugPath, debugFileName);

    await fs.writeFile(debugFilePath, html);
    console.log(`💾 HTML salvo como ${debugFileName}`);

    const configRegex = /var config = ({.*?});/s;
    const match = html.match(configRegex);

    if (!match || match.length < 2) {
      throw new Error("❌ Não consegui extrair o config JSON");
    }

    const config = JSON.parse(match[1]);

    const url = config.routes?.process;
    const schedule = config.webinar?.registrationDates?.[0];

    if (!url || !schedule) {
      throw new Error("❌ Dados de inscrição ausentes no config");
    }

    // Requisição no formato correto
    const payload = new URLSearchParams({
      first_name: nome,
      email: email,
      schedule_id: schedule.schedule_id,
      ts: schedule.ts,
      hash: config.hash
    });

    const result = await axios.post(url, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    return res.json({ sucesso: true, resultado: result.data });

  } catch (erro) {
    console.error("🚨 Erro detalhado:", erro.message);
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      debug_url: `/debug/debug-${Date.now()}.html`
    });
  }
});

// Ativa acesso à pasta de debug
app.use("/debug", express.static(path.join(__dirname, "debug")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
