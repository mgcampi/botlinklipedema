import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use("/debug", express.static(path.join(__dirname, "debug")));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  try {
    const response = await axios.get("https://event.webinarjam.com/register/2/116pqiy");
    const html = response.data;

    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const filePath = path.join(__dirname, "debug", fileName);
    await fs.writeFile(filePath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    const $ = cheerio.load(html);
    const script = $('script').filter((_, el) => $(el).html().includes("var config =")).first();
    const scriptContent = script.html();

    if (!scriptContent) {
      console.error("❌ Não achei o script com o config");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`
      });
    }

    const match = scriptContent.match(/var config = ({[\s\S]*?});\s*var lang/);
    if (!match || !match[1]) {
      console.error("❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`
      });
    }

    const config = JSON.parse(match[1]);
    const processUrl = config.routes.process;
    const scheduleId = config.webinar.registrationDates[0].schedule_id;
    const captchaKey = config.captcha.key;

    const payload = {
      name: nome,
      email: email,
      schedule: scheduleId,
      ts: Date.now().toString(),
      captcha: "",
      captcha_key: captchaKey
    };

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };

    const formData = new URLSearchParams(payload).toString();
    const submit = await axios.post(processUrl, formData, { headers });

    const data = submit.data;
    if (data.status !== "ok") {
      throw new Error("Erro na resposta da inscrição.");
    }

    return res.json({
      status: "ok",
      link: data.redirect_url || "Link não fornecido"
    });

  } catch (error) {
    console.error("🚨 Erro detalhado:", error.message);
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      debug_url: `/debug/${Date.now()}.html`
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
