import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 8080;

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
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log("🌐 Página carregada. Clicando no botão REGISTRO...");

    // Clica no primeiro botão visível (registro)
    await page.waitForSelector("button", { visible: true, timeout: 15000 });
    const botoes = await page.$$("button");
    if (!botoes.length) throw new Error("Nenhum botão encontrado na página.");
    await botoes[0].click();

    console.log("✅ Botão REGISTRO clicado. Aguardando formulário...");

    // Espera DOM atualizar com os inputs
    await page.waitForFunction(() => {
      return document.querySelector('input[placeholder="Insira o primeiro nome..."]');
    }, { timeout: 15000 });

    console.log("✅ Formulário carregado");

    // Preenche dados
    await page.type('input[placeholder="Insira o primeiro nome..."]', nome, { delay: 50 });
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email, { delay: 50 });

    console.log("✍️ Nome e email preenchidos");

    // Aguarda botão habilitar
    await page.waitForFunction(() => {
      const btn = document.querySelector("#register_btn");
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    console.log("🚀 Botão de inscrição habilitado. Clicando...");

    await page.click("#register_btn");

    // Redirecionamento para URL final
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    const finalUrl = page.url();
    await browser.close();

    return res.json({ sucesso: true, url: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    if (browser) await browser.close();
    return res.status(500).json({
      erro: "Erro ao processar inscrição.",
      detalhe: erro.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
