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

  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForTimeout(3000); // espera JS carregar

    const config = await page.evaluate(() => window.config);
    if (!config) throw new Error("❌ Não achei o var config");

    const schedule = config.webinar.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      throw new Error("❌ Dados incompletos no config");
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

    const postResponse = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = postResponse.data?.redirect?.url;
    if (!linkFinal) throw new Error("❌ Inscrição falhou, sem link de redirect");

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err.message,
    });
  } finally {
    await browser.close();
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
