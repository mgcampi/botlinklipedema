// index.js
import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import bodyParser from "body-parser";

puppeteer.use(StealthPlugin());

const app = express();
app.use(bodyParser.json());

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
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForTimeout(4000); // Tempo extra de espera

    const configString = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      const configScript = scripts.find((s) =>
        s.textContent.includes("var config = ")
      );
      if (!configScript) return null;

      const match = configScript.textContent.match(/var config = (\{[\s\S]*?\});/);
      return match ? match[1] : null;
    });

    if (!configString) throw new Error("❌ Não consegui extrair o config JSON");

    const config = JSON.parse(configString);
    const schedule = config.webinar.registrationDates?.[0];
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

    const register = await page.evaluate(async (url, payload) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://event.webinarjam.com/",
        },
        body: JSON.stringify(payload),
      });
      return response.json();
    }, processUrl, payload);

    await browser.close();

    const linkFinal = register?.redirect?.url;
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
