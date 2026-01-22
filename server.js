import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

// Configurable por variable de entorno (Render). Default: Lima
const TZ = process.env.TIMEZONE || "America/Lima";

// Horario: Lun–Vie 09:00–18:00
// Nota: 18:00 es cierre. Consideramos abierto hasta 17:59.
function isOpenNow(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  const weekday = parts.weekday; // Mon, Tue, ...
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);

  const isMonToFri = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  if (!isMonToFri) return false; // Sáb/Dom cerrado

  // Entre 09:00 y 17:59 abierto
  if (hour < 9) return false;
  if (hour > 17) return false;
  // hour == 17 siempre ok, hour==18 ya cae en hour>17
  return true;
}

const menu =
  `✅ Bot Visas & Viajes (MVP)\n\n` +
  `Escribe:\n` +
  `1) Requisitos para ir a mi misión\n` +
  `2) Problemas con un documento\n` +
  `3) Tiempo de trámite\n` +
  `4) Hablar con un asesor\n\n` +
  `Escribe "menu" para ver estas opciones otra vez.`;

const closedMsg =
  `🕘 Gracias por escribir.\n\n` +
  `Nuestro horario es:\n` +
  `Lun–Vie 9:00–18:00\n` +
  `Sáb y Dom: cerrado\n\n` +
  `Para ayudarte apenas abramos, envía en un solo mensaje:\n` +
  `1) Misión\n` +
  `2) Nacionalidad\n` +
  `3) Fecha de inicio del CCM\n` +
  `4) Tu nombre\n\n` +
  `Ejemplo: "Misión: La Paz el Alto  | Nacionalidad: Colombiana | Viaje: 15/03 | Nombre: Ana Motochachi"`;

app.get("/", (req, res) => res.status(200).send("OK - WhatsApp bot running"));

app.post("/whatsapp", (req, res) => {
  const incomingRaw = (req.body.Body || "").trim();
  const incoming = incomingRaw.toLowerCase();

  let reply = "";

  // Si está cerrado, solo dejamos pasar "menu" (opcional) o pedimos datos
  if (!isOpenNow() && incoming !== "menu") {
    reply = closedMsg;
  } else {
    if (incoming === "menu" || incoming === "hola" || incoming === "buenas") {
      reply = menu;
    } else if (incoming === "1") {
      reply =
        `📌 Requisitos para ir a mi misión\n\n` +
        `Dime: nacionalidad + misión asignada.\n` +
        `Ejemplo: "Peruana → Estados Unidos"\n\n` +
        `Escribe "menu" para volver.`;
    } else if (incoming === "2") {
      reply =
        `💰 Problemas con un documento\n\n` +
        `Dime: misión asignada + documento(Ant. Penal/Parti. Nacimiento/Pasaporte).\n\n` +
        `Escribe "menu" para volver.`;
    } else if (incoming === "3") {
      reply =
        `⏱️ Tiempo de trámite\n\n` +
        `Dime el misión asignada y te indico el rango típico.\n\n` +
        `Escribe "menu" para volver.`;
    } else if (incoming === "4") {
      reply =
        `👩‍💼 Hablar con un asesor\n\n` +
        `Envíame:\n- misión asignada\n- Nacionalidad\n- Fecha de inicio del CCM\n- Nombre\n\n` +
        `Escribe "menu" para volver.`;
    } else {
      reply =
        `No entendí: "${incomingRaw}".\n\n` +
        `Escribe "menu" para ver opciones.`;
    }
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
