import express from "express";
import axios from "axios";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  let browser;
  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
    });

    // espera até que o "config" apareça no contexto da página
    await page.waitForFunction(() => window.config !== undefined, {
      timeout: 15000,
    });

    // extrai o objeto config
    const config = await page.evaluate(() => window.config);

    // pega dados necessários
    const schedule = config.webinar?.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      throw new Error("❌ Dados incompletos para inscrição.");
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

    // envia inscrição via POST
    const result = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = result.data?.redirect?.url;

    if (!linkFinal) {
      throw new Error("❌ Inscrição falhou, sem link final.");
    }

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });
  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
