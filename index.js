import express from "express";
import axios from "axios";
import fs from "fs";

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const { nome, email } = req.body;
  console.log("➡️ Iniciando inscrição para:", nome, email);

  try {
    const htmlRes = await axios.get("https://event.webinarjam.com/register/2/116pqiy");
    const html = htmlRes.data;

    const timestamp = Date.now();
    fs.writeFileSync(`debug-${timestamp}.html`, html);
    console.log(`💾 HTML salvo como debug-${timestamp}.html`);

    const configRegex = /var config = ({[\s\S]+?});/;
    const match = html.match(configRegex);

    if (!match || !match[1]) {
      throw new Error("❌ Não consegui extrair o config JSON");
    }

    const config = JSON.parse(match[1]);

    const schedule = config.webinar.registrationDates[0];
    const timezone = Object.values(config.webinar.timezones)[0];

    const payload = {
      schedule_id: schedule.schedule_id,
      event_id: schedule.event_id,
      event_ts: schedule.ts,
      first_name: nome,
      email,
      timezone: timezone.id
    };

    console.log("📦 Payload pronto:", payload);

    const resposta = await axios.post(config.routes.process, payload);
    const urlFinal = resposta.data?.url;

    if (!urlFinal) throw new Error("❌ Resposta não contém link final");

    console.log("✅ Inscrição feita! Link:", urlFinal);
    res.json({ sucesso: true, url: urlFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
