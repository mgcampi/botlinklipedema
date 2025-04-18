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

    // Aguarda o modal aparecer
    await page.waitForSelector('input[placeholder="Insira o primeiro nome..."]', { timeout: 15000 });

    // Preenche nome e email
    await page.type('input[placeholder="Insira o primeiro nome..."]', nome);
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email);

    // Aguarda botão ser habilitado e clica
    await page.evaluate(() => {
      const btn = document.querySelector("#register_btn");
      if (btn) btn.removeAttribute("disabled");
    });

    await page.click("#register_btn");

    // Aguarda redirecionamento (link final)
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });

    const finalUrl = page.url();

    await browser.close();

    return res.json({ sucesso: true, url: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
