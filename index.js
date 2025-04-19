import express from "express";
import axios from "axios";
import fs from "fs/promises";

const app = express();
app.use(express.json());

app.post("/inscrever", async (req, res) => {
  const { nome, email } = req.body;
  console.log(`➡️ Iniciando inscrição para: ${nome} ${email}`);

  try {
    const url = "https://event.webinarjam.com/register/2/116pqiy/form-embed";
    const { data: html } = await axios.get(url);

    const timestamp = Date.now();
    const fileName = `debug-${timestamp}.html`;
    const filePath = `./debug/${fileName}`;
    await fs.writeFile(filePath, html);
    console.log(`💾 HTML salvo como ${fileName}`);

    const match = html.match(/var config = ({[\s\S]+?});\s*var lang = /);
    if (!match) {
      console.error("🚨 Erro na inscrição: ❌ Não consegui extrair o config JSON");
      return res.status(500).json({
        erro: "Erro ao processar inscrição.",
        debug_url: `/debug/${fileName}`,
      });
    }

    const config = JSON.parse(match[1]);
    const { schedule_id } = config.webinar.registrationDates[0];
    const captcha_key = config.captcha.key;

    const payload = {
      name: nome,
      email,
      schedule_id,
      timezone: "America/Sao_Paulo",
      country_code: "BR",
      captcha_key,
      register_without_timezone: 1,
    };

    const resp = await axios.post(
      `https://event.webinarjam.com/register/${config.webinarId}/${config.hash}/process`,
      new URLSearchParams(payload).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const link = resp.data?.webinar_live_room;
    if (!link) {
      throw new Error("❌ Link da live não encontrado na resposta");
    }

    console.log(`✅ Inscrição concluída. Link: ${link}`);
    res.json({ sucesso: true, link });
  } catch (err) {
    console.error("🚨 Erro detalhado:", err.message);
    res.status(500).json({
      erro: "Erro ao processar inscrição.",
    });
  }
});

app.use("/debug", express.static("debug"));

app.listen(8080, () => {
  console.log("🚀 Servidor rodando na porta 8080");
});
