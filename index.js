import express from "express";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middlewares
app.use(express.json());
app.use("/debug", express.static(path.join(__dirname, "debug")));

app.get("/ping", (_, res) => res.send("pong"));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  const url = "https://event.webinarjam.com/register/116pqiy";

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const response = await axios.get(url);
    const html = response.data;

    // Salvar HTML para debug
    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const debugPath = path.join(__dirname, "debug", fileName);
    await fs.writeFile(debugPath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    // Regex flexível para extrair o config mesmo sem "var"
    const configRegex = /config\s*=\s*({.*?});/s;
    const match = html.match(configRegex);

    if (!match || !match[1]) {
      throw new Error("❌ Não consegui extrair o config JSON");
    }

    const config = JSON.parse(match[1]);

    const schedule = config.webinar.registrationDates[0];
    const ts = schedule.ts;
    const schedule_id = schedule.schedule_id;

    const payload = {
      name: nome,
      email: email,
      ts,
      schedule_id,
      event_id: 0,
      register_submit: "Registro",
      "captcha-verified": 1,
    };

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: url,
    };

    const processUrl = config.routes.process;

    const form = new URLSearchParams(payload).toString();

    const resultado = await axios.post(processUrl, form, { headers });

    const redirectUrl = resultado.data?.redirect;

    if (!redirectUrl) {
      throw new Error("❌ Resposta sem link de redirecionamento");
    }

    res.json({ sucesso: true, link: `https://event.webinarjam.com${redirectUrl}` });
  } catch (err) {
    console.error("🚨 Erro detalhado:", err.message);

    const debugUrl = `/debug/${fileName || "erro.html"}`;
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      debug_url: debugUrl,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
