// inscricaoWebinar.js
import axios from "axios";
import cheerio from "cheerio";

export async function inscreverNoWebinarJam(nome, email) {
  try {
    const urlForm = "https://event.webinarjam.com/register/2/116pqiy";
    const htmlResponse = await axios.get(urlForm);
    const $ = cheerio.load(htmlResponse.data);

    const configString = $('script:contains("var config = ")')
      .html()
      .match(/var config = ({[\s\S]*?});/)[1];

    const config = JSON.parse(configString);
    const { event_id, schedule_id, ts } = config.webinar.registrationDates[0];
    const endpoint = config.routes.process;

    const payload = {
      first_name: nome,
      email: email,
      timezone: 26, // ID do timezone de SP
      event_id,
      schedule_id,
      event_ts: ts
    };

    const headers = {
      "Content-Type": "application/json",
      Referer: urlForm
    };

    const postResponse = await axios.post(endpoint, payload, { headers });

    if (postResponse.data?.url) {
      return { success: true, link: postResponse.data.url };
    } else {
      return { success: false, error: "⚠️ Inscrição enviada, mas link não retornado." };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}
