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

    // 1. Baixa o HTML com headers de navegador
    const response = await axios.get("https://event.webinarjam.com/register/2/116pqiy", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const html = response.data;

    // 2. DEBUG: loga parte do HTML pra confirmar que veio certo
    console.log("🔎 Início do HTML:", html.slice(0, 500));

    // 3. Tenta extrair manualmente o JSON do var config
    const start = html.indexOf("var config = ");
    if (start === -1) throw new Error("Não achei o var config");

    const substring = html.slice(start + 13);
    const end = substring.indexOf("};");
    const jsonString = substring.slice(0, end + 1);

    const config = JSON.parse(jsonString);

    // 4. Monta payload
    const schedule = config.webinar.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      throw new Error("Dados incompletos para inscrição");
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

    // 5. Envia a inscrição
    const register = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = register.data?.redirect?.url;
    if (!linkFinal) throw new Error("Inscrição falhou, sem link de redirect");

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("❌ Erro detalhado:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
