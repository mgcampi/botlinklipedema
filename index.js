import express from "express";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

// util pro __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use("/debug", express.static(path.join(__dirname, "public/debug")));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(3000); // aguarda o config carregar

    const html = await page.content();
    const fileName = `debug-${Date.now()}.html`;
    const filePath = path.join(__dirname, "public/debug", fileName);
    await fs.writeFile(filePath, html);
    console.log("💾 HTML salvo como", fileName);

    // extrai o var config
    const configString = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      const target = scripts.find(s => s.textContent.includes("var config = "));
      if (!target) return null;

      const match = target.textContent.match(/var config = (.*?);\n/);
      return match?.[1] || null;
    });

    await browser.close();

    if (!configString) {
      throw {
        message: "❌ Não consegui extrair o config JSON",
        debug_url: `/debug/${fileName}`,
      };
    }

    const config = JSON.parse(configString);
    const schedule = config.webinar?.registrationDates?.[0];
    const processUrl = config.routes?.process;
    const captchaKey = config.captcha?.key;

    if (!schedule || !processUrl || !captchaKey) {
      throw new Error("Dados incompletos no config");
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

    const response = await axios.post(processUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        Referer: "https://event.webinarjam.com/",
      },
    });

    const linkFinal = response.data?.redirect?.url;

    if (!linkFinal) throw new Error("Inscrição falhou, sem link de redirect");

    console.log("✅ Inscrição concluída:", linkFinal);
    res.json({ sucesso: true, link: linkFinal });

  } catch (err) {
    console.error("🚨 Erro na inscrição:", err.message || err);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err.message || "Erro desconhecido",
      debug_url: err.debug_url || undefined,
    });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
