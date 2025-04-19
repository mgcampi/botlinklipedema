// index.js
import express from "express";
import axios from "axios";
import fs from "fs";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Função para extrair JSON da variável 'config' via regex
function extrairConfig(html) {
  const regex = /var config = (\{.*?\});/s;
  const match = html.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (err) {
      console.error("❌ Erro ao fazer parse do JSON:", err);
      return null;
    }
  }
  return null;
}

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  try {
    const response = await axios.get("https://event.webinarjam.com/register/116pqiy", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = response.data;
    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const filePath = `./public/debug/${fileName}`;

    // Salva o HTML para debugging
    fs.writeFileSync(filePath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    const config = extrairConfig(html);

    if (!config) {
      console.error("🚨 Erro na inscrição: ❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`,
      });
    }

    const schedule_id = config.webinar.registrationDates[0].schedule_id;
    const ts = config.webinar.registrationDates[0].ts;

    const payload = {
      name: nome,
      email: email,
      schedule_id,
      ts,
      hash: config.hash,
      timezone: config.webinar.configTimezone,
      country: config.lead.country_code || "BR",
      captcha: config.captcha.key,
    };

    const result = await axios.post(
      config.routes.process,
      new URLSearchParams(payload),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("✅ Inscrição feita com sucesso!");
    return res.json({ status: "ok", inscrito_em: result.request.res.responseUrl });
  } catch (err) {
    console.error("🚨 Erro detalhado:", err.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

// Serve arquivos da pasta debug
app.use("/debug", express.static("public/debug"));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
