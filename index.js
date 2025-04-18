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

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", { waitUntil: "networkidle2" });

    console.log("🌐 Página carregada. Clicando no botão REGISTRO...");

    // Clica no primeiro botão da página (REGISTRO)
    const botoes = await page.$$('button');
    if (botoes.length > 0) {
      await botoes[0].click();
      console.log("✅ Clicou no botão REGISTRO");
    } else {
      await browser.close();
      return res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: "Botão REGISTRO não encontrado." });
    }

    console.log("⏳ Aguardando 15 segundos pro modal carregar...");
    await page.waitForTimeout(15000); // espera 15s

    console.log("🔍 Buscando campos do formulário...");

    await page.waitForSelector('input[placeholder*="primeiro nome"]', { timeout: 15000 });
    await page.waitForSelector('input[placeholder*="endereço de e-mail"]', { timeout: 5000 });

    console.log("📝 Preenchendo formulário...");

    await page.type('input[placeholder*="primeiro nome"]', nome);
    await page.type('input[placeholder*="endereço de e-mail"]', email);

    // Remove atributo "disabled" e clica no botão
    await page.evaluate(() => {
      const btn = document.querySelector("#register_btn");
      if (btn) btn.removeAttribute("disabled");
    });

    console.log("✅ Clicando em INSCREVA-SE JÁ...");
    await page.click("#register_btn");

    // Aguarda redirecionamento
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    const finalUrl = page.url();

    await browser.close();

    console.log("🎯 Inscrição concluída com sucesso!");
    return res.json({ sucesso: true, url: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: erro.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
