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

    const registroBtn = await page.$('button[aria-label="REGISTRO"]');
    if (registroBtn) {
      await registroBtn.click();
      console.log("✅ Clicou no botão REGISTRO");
    } else {
      throw new Error("Botão REGISTRO não encontrado.");
    }

    console.log("⏳ Aguardando modal abrir (10s)...");
    await page.waitForTimeout(10000); // Espera fixa de 10s

    // Aguarda campos de nome e email
    await page.waitForSelector('input[placeholder="Insira o primeiro nome..."]', { visible: true, timeout: 10000 });
    await page.waitForSelector('input[placeholder="Insira o endereço de e-mail..."]', { visible: true, timeout: 10000 });

    console.log("✅ Modal visível. Preenchendo dados...");

    await page.type('input[placeholder="Insira o primeiro nome..."]', nome, { delay: 50 });
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email, { delay: 50 });

    // Aguarda botão se habilitar
    await page.waitForFunction(() => {
      const btn = document.querySelector("#register_btn");
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    console.log("✅ Botão de inscrição habilitado. Enviando...");

    await page.click("#register_btn");

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
