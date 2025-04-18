// index.js
import express from "express";
import { registrarNoWebinar } from "./register.js";   // ← importa o fluxo completo

const app  = express();
const PORT = process.env.PORT || 8080;

/* Rotas básicas ----------------------------------------------------------- */
app.get("/",   (_, res) => res.send("API do Autobot rodando"));
app.get("/ping", (_, res) => res.send("pong"));

/* Rota principal de inscrição --------------------------------------------- */
app.get("/webinarjam", async (req, res) => {
  const { nome, email } = req.query;

  if (!nome || !email) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'nome' e 'email' são obrigatórios." });
  }

  try {
    console.log("🚀 Iniciando inscrição para:", nome, email);

    // chama o helper que abre o navegador, preenche e devolve o link
    const link = await registrarNoWebinar(nome, email);

    console.log("🎯 Inscrição concluída. Link capturado:", link);
    return res.json({ sucesso: true, link });

  } catch (err) {
    console.error("❌ ERRO DETALHADO:", err.message);
    return res
      .status(500)
      .json({ erro: "Erro ao processar inscrição.", detalhe: err.message });
  }
});

/* Sobe o servidor --------------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
