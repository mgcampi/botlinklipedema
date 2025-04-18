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

  console.log("🚀 Iniciando inscrição");

  if (!nome || !email) {
    return res.status(400).json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("🌐 Página carregada. Clicando no botão REGISTRO...");

    const botoes = await page.$$('button');
    if (!botoes.length) throw new Error("❌ Nenhum botão encontrado na página.");
    await botoes[0].click();
    console.log("✅ Botão REGISTRO clicado");

    console.log("⏳ Aguardando 15 segundos pro modal aparecer...");
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log("🔍 Esperando inputs no DOM...");

    await page.waitForFunction(() => {
      return document.querySelectorAll('input').length >= 2;
    }, { timeout: 20000 });

    console.log("✅ Inputs detectados. Preenchendo nome e email...");

    const inputs = await page.$$('input');
    await inputs[0].type(nome);
    await inputs[1].type(email);

    // Habilita o botão, se ainda estiver desativado
    await page.evaluate(() => {
      const btn = document.querySelector("#register_btn");
      if (btn) btn.removeAttribute("disabled");
    });

    console.log("🚀 Clicando no botão INSCREVA-SE JÁ...");
    await page.click("#register_btn");

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    const finalUrl = page.url();

    await browser.close();

    console.log("🎯 Inscrição concluída com sucesso!");
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
