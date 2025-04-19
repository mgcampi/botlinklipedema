import express from "express";
import axios from "axios";
import fs from "fs/promises";
import { launch } from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const app = express();
app.use(express.json());

puppeteerExtraUse();

function puppeteerExtraUse() {
  // Aplica o plugin stealth
  launch.use(StealthPlugin());
}

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const browser = await launch({
      headless: true,
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
      waitUntil: "networkidle2",
      timeout: 30000
    });

    const html = await page.content();
    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const fullPath = `./public/debug/${fileName}`;
    await fs.mkdir("./public/debug", { recursive: true });
    await fs.writeFile(fullPath, html);

    const configRaw = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script")).map(
        (s) => s.textContent
      );
      for (const content of scripts) {
        if (content.includes("var config =")) {
          const start = content.indexOf("var config = ") + 13;
          const end = content.indexOf("};", start);
          if (end !== -1) {
            const json = content.slice(start, end + 1);
            return json;
          }
        }
      }
      return null;
    });

    await browser.close();

    if (!configRaw) {
      throw new Error("❌ Não consegui extrair o config JSON");
    }

    const config = JSON.parse(configRaw);

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
        response: "manual"
      }
    };

    const register = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/"
      }
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
