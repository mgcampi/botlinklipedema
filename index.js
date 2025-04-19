import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });
  }

  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ],
    });

    const page = await browser.newPage();
    await page.goto("https://event.webinarjam.com/register/2/116pqiy", {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    // Preenche o formulário
    await page.type('input[name="name"]', nome);
    await page.type('input[name="email"]', email);
    await page.click('button[type="submit"]');

    // Aguarda o redirecionamento e coleta do link
    let finalLink = null;

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("/go/live/")) {
        finalLink = text.match(/https:\/\/[^ ]+/)?.[0];
      }
    });

    // Executa o script dentro da página
    await page.evaluate(() => {
      const tryFind = () => {
        const byId = document.querySelector('a[id^="js_live_link_"]');
        if (byId && byId.href) return byId.href;

        const byHref = [...document.querySelectorAll("a")].find(a => /\/go\/live\//i.test(a.href));
        if (byHref) return byHref.href;

        const widget = document.querySelector('[data-widget-key="liveLink"]');
        if (widget) return widget.textContent.trim();

        return null;
      };

      let count = 0;
      const interval = setInterval(() => {
        const link = tryFind();
        if (link) {
          clearInterval(interval);
          console.log(link);
        } else if (++count > 60) {
          clearInterval(interval);
          console.warn("⚠️ Não encontrei link /go/live/ em 30s");
        }
      }, 500);
    });

    // Aguarda o console.log com o link
    const timeout = 35000;
    const waitForLink = new Promise((resolve) => {
      const check = () => {
        if (finalLink) resolve(finalLink);
        else setTimeout(check, 1000);
      };
      check();
    });

    const link = await Promise.race([
      waitForLink,
      new Promise((_, reject) => setTimeout(() => reject("❌ Timeout ao esperar o link"), timeout))
    ]);

    await browser.close();
    console.log("✅ Link encontrado:", link);
    res.json({ sucesso: true, link });

  } catch (erro) {
    if (browser) await browser.close();
    console.error("🚨 Erro na inscrição:", erro);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
