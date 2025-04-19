import express from "express";
import { inscreverUsuario } from "./inscricaoWebinar.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post("/webinar", async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e e-mail são obrigatórios." });
  }

  try {
    const link = await inscreverUsuario(nome, email);
    res.json({ sucesso: true, link });
  } catch (erro) {
    console.error("Erro na inscrição:", erro.message);
    res.status(500).json({ erro: "Erro ao processar inscrição." });
  }
});

app.get("/", (_, res) => res.send("✅ Bot do WebinarJam rodando!"));

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
