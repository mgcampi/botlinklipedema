import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";

const app = express();
app.use(express.json());

puppeteer.use(StealthPlugin());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle0", // espera todos os recursos carregarem
      timeout: 30000,
    });

    const html = await page.content();
    await browser.close();

    // DEBUG opcional:
    // console.log("🔎 Início do HTML:", html.slice(0, 300));

    const start = html.indexOf("var config = ");
    if (start === -1) throw new Error("❌ Não achei o var config");

    const slice = html.slice(start + 13);
    const end = slice.indexOf("};");
    const jsonString = slice.slice(0, end + 1);
    const config = JSON.parse(jsonString);

    const schedule = config.webinar?.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      throw new Error("❌ Dados incompletos para inscrição");
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

    const register = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = register.data?.redirect?.url;

    if (!linkFinal) throw new Error("❌ Inscrição falhou, sem link de redirect");

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: err.message });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
