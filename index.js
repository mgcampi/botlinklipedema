import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("API do Autobot rodando");
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });
  }

  let browser;

  try {
    console.log("🚀 Iniciando inscrição");

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("🌐 Página carregada. Aguardando botão REGISTRO...");

    // Clica no botão REGISTRO
    await page.waitForSelector("button.register-button", { visible: true });
    await page.click("button.register-button");
    console.log("✅ Clicou no botão REGISTRO");

    // Aguarda o modal abrir
    console.log("⏳ Aguardando modal abrir...");
    await page.waitForSelector("input[name='name']", { visible: true, timeout: 10000 });
    await page.waitForSelector("input[name='email']", { visible: true, timeout: 10000 });
    console.log("✅ Modal visível. Preenchendo dados...");

    // Preenche nome e email
    await page.type("input[name='name']", nome, { delay: 50 });
    await page.type("input[name='email']", email, { delay: 50 });

    // Aguarda botão de inscrição habilitar
    await page.waitForFunction(() => {
      const btn = document.querySelector("button.register-button");
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    console.log("✅ Botão de inscrição habilitado. Enviando...");

    // Clica no botão de inscrição
    await page.click("button.register-button");

    // Aguarda redirecionamento
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    const finalUrl = page.url();
    await browser.close();

    return res.json({ sucesso: true, url: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    if (browser) await browser.close();
    return res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: erro.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
