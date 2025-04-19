import express from "express";
import { launch } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

launch.use(StealthPlugin());

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const browser = await launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: "/usr/bin/chromium"
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle0"
    });

    console.log("⏳ Aguardando config...");
    await page.waitForFunction(
      () => typeof window.config !== 'undefined' && window.config.routes,
      { timeout: 30000 }
    );

    const config = await page.evaluate(() => window.config);
    await browser.close();

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

    const response = await fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const linkFinal = data?.redirect?.url;

    if (!linkFinal) throw new Error("Inscrição falhou, sem link final");

    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
