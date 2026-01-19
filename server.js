import express from "express";
import twilio from "twilio";

const app = express();

// Twilio envía application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.status(200).send("OK - WhatsApp bot running");
});

app.post("/whatsapp", (req, res) => {
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From || "unknown";

  const reply =
    `✅ Bot Visas & Viajes (MVP)\n\n` +
    `Recibí tu mensaje: "${incomingMsg}"\n` +
    `De: ${from}\n\n` +
    `Escribe:\n1) Requisitos visa\n2) Costos\n3) Tiempo de trámite\n4) Hablar con un asesor`;

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);

  res.type("text/xml").send(twiml.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
