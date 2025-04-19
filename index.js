import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve arquivos da pasta /debug
app.use("/debug", express.static(path.join(__dirname, "debug")));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  const refererUrl = "https://event.webinarjam.com/register/2/116pqiy";

  console.log("➡️ Iniciando inscrição para:", nome, email);

  try {
    // 1. Baixar a página de inscrição
    const response = await axios.get(refererUrl);
    const html = response.data;

    // 2. Salvar HTML para debug
    const fileName = `debug-${Date.now()}.html`;
    const filePath = path.join(__dirname, "debug", fileName);
    fs.writeFileSync(filePath, html);
    console.log("💾 HTML salvo como", fileName);

    // 3. Usar regex para extrair o script com a variável config
    const match = html.match(/var\s+config\s*=\s*(\{.*?\});\s*var\s+lang\s*=/s);
    if (!match || match.length < 2) {
      console.error("🚨 Erro na inscrição: ❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`,
      });
    }

    const config = JSON.parse(match[1]);

    // 4. Montar payload
    const payload = {
      first_name: nome,
      email: email,
      schedule: config.webinar.registrationDates[0].schedule_id,
      timezone: 26,
      country_code: "BR"
    };

    // 5. Fazer o POST para o endpoint do WebinarJam
    const result = await axios.post(config.routes.process, payload, {
      headers: {
        "Content-Type": "application/json",
        "Referer": refererUrl,
      }
    });

    console.log("✅ Inscrição enviada com sucesso:", result.data);

    return res.json({
      sucesso: true,
      dados: result.data,
      link_final: result.data.redirect_url || "Verifique seu e-mail para o link"
    });

  } catch (erro) {
    console.error("🚨 Erro detalhado:", erro.response?.data || erro.message);
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhes: erro.response?.data || erro.message,
      debug_url: `/debug/${fileName}`,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
