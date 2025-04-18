import express from "express";
import { registrarNoWebinar } from "./register.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (_, res) => res.send("API do Autobot rodando"));
app.get("/ping", (_, res) => res.send("pong"));

app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;
  if (!nome || !email)
    return res.status(400).json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });

  try {
    console.log("🚀 Iniciando inscrição");
    const link = await registrarNoWebinar(nome, email);
    console.log("🎯 Inscrição concluída! Link:", link);
    return res.json({ sucesso: true, link });
  } catch (erro) {
    console.error("❌ ERRO DETALHADO:", erro.message);
    return res.status(500).json({ erro: "Erro ao processar inscrição.", detalhe: erro.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
