import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🚀 API do Autobot rodando");
});

// 💡 Rota de health check exigida pelo Render
app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email são obrigatórios." });
  }

  let browser;

  try {
    console.log("🚀 Iniciando inscrição via Puppeteer");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // Acessa a página do WebinarJam
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Espera o modal aparecer
    await page.waitForSelector('input[placeholder="Insira o primeiro nome..."]', { visible: true });
    await page.type('input[placeholder="Insira o primeiro nome..."]', nome);

    await page.waitForSelector('input[placeholder="Insira o endereço de e-mail..."]', { visible: true });
    await page.type('input[placeholder="Insira o endereço de e-mail..."]', email);

    // Espera o botão se habilitar
    await page.waitForFunction(() => {
      const btn = document.querySelector('#register_btn');
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    await page.click("#register_btn");

    // Espera o redirecionamento
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });

    const finalUrl = page.url();
    await browser.close();

    return res.json({ sucesso: true, link: finalUrl });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    if (browser) await browser.close();
    return res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
