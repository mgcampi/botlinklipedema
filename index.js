import express from "express";
import axios from "axios";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import path from "path";

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());
app.use("/debug", express.static("public/debug"));

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  let browser;
  try {
    // 1. Abre navegador e acessa a página
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "domcontentloaded",
    });

    // 2. Extrai o config direto do contexto da página
    const configString = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      const targetScript = scripts.find((s) =>
        s.textContent.includes("var config = ")
      );
      if (!targetScript) return null;

      const match = targetScript.textContent.match(
        /var config\s*=\s*(\{.*?\});/s
      );
      return match ? match[1] : null;
    });

    if (!configString) throw new Error("❌ Não consegui extrair o config JSON");
    const config = JSON.parse(configString);

    // 3. Encerra o browser
    await browser.close();

    // 4. Extrai dados do config
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

    // 5. Faz inscrição via API
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
    if (browser) await browser.close();

    const fileName = `debug-${Date.now()}.html`;
    const filePath = path.join("public", "debug", fileName);
    try {
      await fs.mkdir("public/debug", { recursive: true });
      await fs.writeFile(filePath, "Erro ou página indisponível.");
    } catch (e) {
      console.warn("⚠️ Não consegui salvar debug:", e.message);
    }

    console.error("🚨 Erro na inscrição:", err?.message || err);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: err?.message || String(err),
      debug_url: `/debug/${fileName}`,
    });
  }
});

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
