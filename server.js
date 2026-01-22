import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

// ===== Config =====
const TZ = process.env.TIMEZONE || "America/Lima";

// “Memoria” simple en RAM: from -> { section: "MAIN" | "DOCS" | ... }
const sessions = new Map();
const getSession = (from) => {
  if (!sessions.has(from)) sessions.set(from, { section: "MAIN" });
  return sessions.get(from);
};
const setSection = (from, section) => {
  const s = getSession(from);
  s.section = section;
};

// ===== Horario =====
function isOpenNow(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
  const weekday = parts.weekday;
  const hour = parseInt(parts.hour, 10);

  const isMonToFri = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  if (!isMonToFri) return false;

  if (hour < 9) return false;
  if (hour > 17) return false; // 18:00 ya cerrado
  return true;
}

// ===== Textos =====
const MENU_MAIN =
  `✅ Bot Visas & Viajes (MVP)\n\n` +
  `Escribe:\n` +
  `1) Requisitos para ir a mi misión\n` +
  `2) Problemas con un documento\n` +
  `3) Tiempo de trámite\n` +
  `4) Hablar con un asesor\n\n` +
  `Comandos: "menu" (inicio), "salir" (reiniciar)`;

const MSG_CLOSED =
  `🕘 Gracias por escribir.\n\n` +
  `Nuestro horario es:\n` +
  `Lun–Vie 9:00–18:00\n` +
  `Sáb y Dom: cerrado\n\n` +
  `Para ayudarte apenas abramos, envía en un solo mensaje:\n` +
  `1) Misión\n` +
  `2) Nacionalidad\n` +
  `3) Fecha de inicio del CCM\n` +
  `4) Tu nombre\n\n` +
  `Ejemplo: "Misión: La Paz El Alto | Nacionalidad: Colombiana | CCM: 15/03 | Nombre: Ana"`;

// Submenú Documentos (ejemplo de “sección”)
const MENU_DOCS =
  `📄 Problemas con un documento\n\n` +
  `¿Con cuál necesitas ayuda?\n` +
  `1) Pasaporte\n` +
  `2) Antecedentes penales\n` +
  `3) Partida de nacimiento\n` +
  `4) Otro\n\n` +
  `Escribe el número o "menu" para volver al inicio.`;

// ===== Helpers =====
function normalize(text) {
  return (text || "").trim().toLowerCase();
}

// Condición por palabras clave (ejemplo)
function hasKeyword(msg, keywords) {
  return keywords.some(k => msg.includes(k));
}

// ===== Router por secciones =====
function handleMain(msg, from) {
  if (msg === "1") {
    setSection(from, "REQ");
    return (
      `📌 Requisitos para ir a mi misión\n\n` +
      `Envíame en un mensaje:\n` +
      `- Nacionalidad\n` +
      `- Misión asignada\n` +
      `- Fecha inicio CCM\n\n` +
      `Ejemplo: "Nacionalidad: Peruana | Misión: Quito | CCM: 15/03"\n\n` +
      `Escribe "menu" para volver.`
    );
  }

  if (msg === "2") {
    setSection(from, "DOCS");
    return MENU_DOCS;
  }

  if (msg === "3") {
    setSection(from, "TIME");
    return (
      `⏱️ Tiempo de trámite\n\n` +
      `Dime:\n- Misión asignada\n- Nacionalidad\n- Qué documento/visa\n\n` +
      `Escribe "menu" para volver.`
    );
  }

  if (msg === "4") {
    setSection(from, "HUMAN");
    return (
      `👩‍💼 Hablar con un asesor\n\n` +
      `Envíame:\n- Misión asignada\n- Nacionalidad\n- Fecha inicio CCM\n- Nombre\n\n` +
      `Un asesor te contactará.\n\n` +
      `Escribe "menu" para volver.`
    );
  }

  // Condición extra por keywords desde el menú (ejemplo)
  if (hasKeyword(msg, ["pasaporte", "antecedentes", "partida"])) {
    setSection(from, "DOCS");
    return `Veo que es sobre documentos. 👇\n\n${MENU_DOCS}`;
  }

  return `No entendí. Escribe "menu" para ver opciones.`;
}

function handleDocs(msg, from) {
  // Sub-opciones dentro de Documentos
  if (msg === "1") {
    return (
      `🛂 Pasaporte\n\n` +
      `Cuéntame:\n- País donde estás\n- Nacionalidad\n- ¿Está vencido o por vencer?\n- Fecha inicio CCM\n\n` +
      `Escribe "menu" para volver al inicio o "2" para ver otros documentos.`
    );
  }
  if (msg === "2") {
    return (
      `✅ Antecedentes penales\n\n` +
      `Cuéntame:\n- País donde lo tramitas\n- Nacionalidad\n- ¿Lo necesitas apostillado?\n- Fecha inicio CCM\n\n` +
      `Escribe "menu" para volver al inicio o "1/3/4" para otros documentos.`
    );
  }
  if (msg === "3") {
    return (
      `📜 Partida de nacimiento\n\n` +
      `Cuéntame:\n- País/ciudad donde está inscrito\n- Si necesitas legalización/apostilla\n- Fecha inicio CCM\n\n` +
      `Escribe "menu" para volver al inicio.`
    );
  }
  if (msg === "4") {
    return (
      `📝 Otro documento\n\n` +
      `Escribe cuál documento es y qué problema tienes.\n\n` +
      `Escribe "menu" para volver al inicio.`
    );
  }

  return `En Documentos, responde 1–4. O escribe "menu" para volver.`;
}

// Puedes añadir más secciones así (REQ, TIME, HUMAN) con su propio handler
function handleReq(msg, from) {
  // Condición ejemplo: si el usuario manda un texto largo, lo aceptamos como “datos”
  if (msg.length >= 10) {
    return (
      `Gracias. ✅\n\n` +
      `Recibí tus datos. Un asesor lo revisará.\n\n` +
      `Mientras tanto, escribe "menu" si quieres ver opciones.`
    );
  }
  return `En Requisitos, envíame nacionalidad + misión + fecha CCM (en un mensaje). O "menu".`;
}

function handleTime(msg, from) {
  if (msg.length >= 8) {
    return `Gracias ✅. Con esa info te doy un estimado. (MVP: aquí luego ponemos rangos por país/documento).\n\nEscribe "menu" para volver.`;
  }
  return `En Tiempo de trámite, dime misión + nacionalidad + documento/visa. O "menu".`;
}

function handleHuman(msg, from) {
  if (msg.length >= 8) {
    return `Perfecto ✅. Ya registré tu solicitud y un asesor te contactará.\n\nEscribe "menu" para volver.`;
  }
  return `Para asesor, envía misión + nacionalidad + fecha CCM + nombre. O "menu".`;
}

function routeBySection(section, msg, from) {
  switch (section) {
    case "DOCS": return handleDocs(msg, from);
    case "REQ": return handleReq(msg, from);
    case "TIME": return handleTime(msg, from);
    case "HUMAN": return handleHuman(msg, from);
    case "MAIN":
    default: return handleMain(msg, from);
  }
}

// ===== Webhook =====
app.get("/", (req, res) => res.status(200).send("OK - WhatsApp bot running"));

app.post("/whatsapp", (req, res) => {
  const from = req.body.From || "unknown";
  const incomingRaw = (req.body.Body || "").trim();
  const msg = normalize(incomingRaw);

  // Comandos globales (funcionan en cualquier sección)
  if (msg === "salir" || msg === "reset") {
    setSection(from, "MAIN");
  }
  if (msg === "menu" || msg === "hola" || msg === "buenas") {
    setSection(from, "MAIN");
  }

  let reply = "";

  // Condición de horario: si está cerrado y NO escribió menu/salir
  const isGlobalCommand = ["menu", "hola", "buenas", "salir", "reset"].includes(msg);
  if (!isOpenNow() && !isGlobalCommand) {
    reply = MSG_CLOSED;
  } else {
    const session = getSession(from);
    reply = (session.section === "MAIN") ? MENU_MAIN : ""; // opcional: no mandar menu siempre
    // Enrutamos según sección
    reply = routeBySection(session.section, msg, from);

    // Si pidió menu, aseguramos que se muestre el menú principal
    if (msg === "menu" || msg === "hola" || msg === "buenas") {
      reply = MENU_MAIN;
    }
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type("text/xml").send(twiml.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
