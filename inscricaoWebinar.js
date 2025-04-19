import axios from "axios";
import * as cheerio from "cheerio";

export async function inscreverUsuario(nome, email) {
  const URL_FORM = "https://event.webinarjam.com/register/2/116pqiy";

  // 1. Acessa o formulário e extrai o objeto `config` embutido no HTML
  const { data: html } = await axios.get(URL_FORM);
  const $ = cheerio.load(html);

  const scriptContent = $("script")
    .filter((_, el) => $(el).html().includes("var config ="))
    .html();

  const match = scriptContent.match(/var config = ({[\s\S]+?});/);
  if (!match) throw new Error("Não foi possível extrair o config");

  const config = eval(`(${match[1]})`);

  // 2. Monta os dados do payload para a inscrição
  const { event_id, schedule_id, ts } = config.webinar.registrationDates[0];
  const timezoneId = 26; // America/Sao_Paulo

  const payload = {
    event_id,
    schedule_id,
    event_ts: ts,
    timezone: timezoneId,
    first_name: nome,
    email,
  };

  // 3. Envia a inscrição
  const resposta = await axios.post(config.routes.process, payload);
  if (!resposta.data?.url) throw new Error("Inscrição falhou");

  return resposta.data.url;
}
