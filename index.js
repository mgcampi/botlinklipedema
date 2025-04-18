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
      headless: "new", // para compatibilidade com novas versões do Puppeteer
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("🌐 Página carregada. Clicando no primeiro botão visível...");

    await page.waitForSelector("button", { visible: true, timeout: 15000 });

    const botoes = await page.$$("button");
    if (botoes.length === 0) throw new Error("❌ Nenhum botão encontrado na página.");
    
    await botoes[0].click();
    console.log("✅ Clicou no primeiro botão da página");

    // Aguarda o modal abrir (sem usar waitForTimeout)
    console.log("⏳ Aguardando modal (10s)...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Espera os campos aparecerem
    await page.waitForSelector('input[placeholder="Insira o primeiro nome..."]', { visible: true, timeout: 10000 });
    await page.waitForSelector('input[placeholder="Insira o endereço de e-mail..."]', { visible: true, timeout: 10000 });

    console.log("✅ Campos visíveis. Preenchendo...");

    await page.type('input[placeholder="Insira o primeiro nome..."]', nome, { delay: 50 });
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email, { delay: 50 });

    // Espera o botão ficar habilitado
    await page.waitForFunction(() => {
      const btn = document.querySelector("#register_btn");
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    console.log("🚀 Botão habilitado. Clicando pra inscrever...");

    await page.click("#register_btn");

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
