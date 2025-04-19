import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    // Passo 1: Buscar HTML da página de inscrição
    const htmlResponse = await axios.get("https://event.webinarjam.com/register/2/116pqiy");
    const html = htmlResponse.data;

    // Passo 2: Extrair string do var config
    const match = html.match(/var\s+config\s*=\s*(\{.*?\});/s);
    if (!match) {
      console.error("❌ Não consegui extrair o config JSON");
      return res.status(500).json({ erro: "Erro ao extrair dados da página." });
    }

    const configStr = match[1];
    const config = JSON.parse(configStr);

    // Passo 3: Enviar inscrição
    const schedule = config.webinar.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      return res.status(500).json({ erro: "Dados incompletos para inscrição." });
    }

    const payload = {
      name: nome,
      email: email,
      schedule_id: schedule.schedule_id,
      tz: "America/Sao_Paulo",
      captcha: {
        challenge: "manual",
        key: captchaKey,
        response: "manual",
      },
    };

    const response = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = response.data?.redirect?.url;

    if (!linkFinal) {
      console.error("❌ Inscrição falhou: Sem link de redirect");
      return res.status(500).json({ erro: "Erro ao finalizar inscrição." });
    }

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
