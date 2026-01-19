import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

const menu =
  `✅ Bot Visas & Viajes (MVP)\n\n` +
  `Escribe:\n` +
  `1) Requisitos visa\n` +
  `2) Costos\n` +
  `3) Tiempo de trámite\n` +
  `4) Hablar con un asesor\n\n` +
  `Escribe "menu" para ver estas opciones otra vez.`;

app.get("/", (req, res) => res.status(200).send("OK - WhatsApp bot running"));

app.post("/whatsapp", (req, res) => {
  const incomingMsg = (req.body.Body || "").trim().toLowerCase();

  let reply = "";

  if (incomingMsg === "menu" || incomingMsg === "hola" || incomingMsg === "buenas") {
    reply = menu;
  } else if (incomingMsg === "1") {
    reply =
      `📌 Requisitos visa (MVP)\n\n` +
      `Dime a qué país viajas y tu nacionalidad.\n` +
      `Ejemplo: "Peruano → Estados Unidos"\n\n` +
      `Escribe "menu" para volver.`;
  } else if (incomingMsg === "2") {
    reply =
      `💰 Costos (MVP)\n\n` +
      `Los costos dependen del país destino y tipo de visa.\n` +
      `Dime: país + tipo (turismo/estudios/trabajo).\n\n` +
      `Escribe "menu" para volver.`;
  } else if (incomingMsg === "3") {
    reply =
      `⏱️ Tiempo de trámite (MVP)\n\n` +
      `Varía por país y temporada.\n` +
      `Dime el país destino y te indico el rango típico.\n\n` +
      `Escribe "menu" para volver.`;
  } else if (incomingMsg === "4") {
    reply =
      `👩‍💼 Hablar con un asesor\n\n` +
      `Por favor envía:\n` +
      `- País destino\n` +
      `- Nacionalidad\n` +
      `- Fecha aproximada de viaje\n` +
      `Y un asesor te contactará.\n\n` +
      `Escribe "menu" para volver.`;
  } else {
    reply =
      `No entendí "${incomingMsg}".\n\n` +
      `Escribe "menu" para ver las opciones.`;
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
