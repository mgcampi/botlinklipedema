import express from "express";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", { waitUntil: "domcontentloaded" });

    // aguarda renderização completa
    await new Promise(resolve => setTimeout(resolve, 2000));

    const html = await page.content();
    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const debugPath = path.join(__dirname, "public", "debug", fileName);
    await fs.writeFile(debugPath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    const start = html.indexOf("var config = ");
    if (start === -1) throw new Error("❌ Não achei o var config");

    const jsonStart = start + "var config = ".length;
    const jsonEnd = html.indexOf("};", jsonStart);
    const jsonString = html.slice(jsonStart, jsonEnd + 1);

    const config = JSON.parse(jsonString);

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
        response: "manual"
      }
    };

    const response = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/"
      }
    });

    const linkFinal = response.data?.redirect?.url;
    if (!linkFinal) throw new Error("❌ Inscrição falhou");

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err.message,
      debug_url: `/debug/${fileName}`
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.use("/debug", express.static(path.join(__dirname, "public", "debug")));

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
