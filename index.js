import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("API do Autobot rodando");
});

app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;

  console.log("🚀 Iniciando inscrição");

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Vai pro formulário
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle0",
    });

    // Espera o modal aparecer
    await page.waitForSelector('input[placeholder="Insira o primeiro nome..."]', {
      timeout: 15000,
    });

    // Preenche nome
    await page.type('input[placeholder="Insira o primeiro nome..."]', nome);
    // Preenche email
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email);

    // Ativa botão
    await page.evaluate(() => {
      const btn = document.querySelector("#register_btn");
      btn.removeAttribute("disabled");
    });

    // Clica
    await page.click("#register_btn");

    // Espera redirecionar
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });

    const finalUrl = page.url();
    await browser.close();

    return res.json({ link: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro);
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
