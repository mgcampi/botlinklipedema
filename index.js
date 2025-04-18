const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 API do Autobot rodando");
});

app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", { waitUntil: 'networkidle2' });

    // Espera botão registro e clica
    await page.waitForSelector(".register-button, .register_btn", { timeout: 10000 });
    await page.click(".register-button, .register_btn");

    // Preenche formulário
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.type('input[type="text"]', nome);
    await page.type('input[type="email"]', email);

    await page.waitForSelector('button[id="register_btn"]:not([disabled])', { timeout: 10000 });
    await page.click('button[id="register_btn"]:not([disabled])');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const finalURL = page.url();

    res.json({ finalURL });
  } catch (err) {
    console.error("❌ Erro DETALHADO:", err.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
