import express from "express";
import axios from "axios";
import { launch } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const app = express();
app.use(express.json());

puppeteerExtra.use(StealthPlugin());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const browser = await launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process"
      ]
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2"
    });

    const html = await page.content();
    await browser.close();

    const start = html.indexOf("var config = ");
    if (start === -1) throw new Error("❌ Não achei o var config");

    const substring = html.slice(start + 13);
    const end = substring.indexOf("};");
    const jsonString = substring.slice(0, end + 1);

    const config = JSON.parse(jsonString);

    const schedule = config.webinar?.registrationDates?.[0];
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
        response: "manual"
      }
    };

    const result = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/"
      }
    });

    const linkFinal = result.data?.redirect?.url;
    if (!linkFinal) throw new Error("Inscrição falhou, sem link de redirect");

    console.log("✅ Inscrição concluída:", linkFinal);
    return res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("❌ Erro detalhado:", err.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
