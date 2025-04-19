const express = require("express");
const axios = require("axios");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

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
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Espera o var config estar carregado
    await page.waitForFunction(() => {
      return window.config !== undefined;
    }, { timeout: 15000 });

    const config = await page.evaluate(() => config);
    await browser.close();

    // DEBUG opcional
    const debugDir = path.join(__dirname, "public", "debug");
    fs.mkdirSync(debugDir, { recursive: true });
    const fileName = `debug-${Date.now()}.json`;
    fs.writeFileSync(path.join(debugDir, fileName), JSON.stringify(config, null, 2));

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
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err.message,
    });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
