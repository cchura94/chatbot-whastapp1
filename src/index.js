const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");

const store = makeInMemoryStore({});
const axios = require("axios");

store.readFromFile("./baileys_store.json");

setInterval(() => {
  store.writeToFile("./baileys_store.json");
}, 10_000);

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    syncFullHistory: true,
    auth: state,
    printQRInTerminal: true,
  });

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("Conexion Abierta");
    }
  });

  const userContexts = {};

  function sendMenuPrincipal(sock, userId) {
    const menuMessage = `Hola! *¿Como puedo ayudarte?*
    1. Información sobre nuestros productos
    2. Soporte Técnico
    3. Contactar con Ventas
                            `;

    sock.sendMessage(userId, {
      image: {
        url: "https://img.freepik.com/vector-gratis/robot-vectorial-graident-ai_78370-4114.jpg",
      },
      caption: "Bienvenidos...",
    });

    sock.sendMessage(userId, { text: menuMessage });
  }

  function sendSoporteMenu(sock, userId) {
    const menuMessage = `Soporte Técnico:
    1. Problemas de inicio de sesion
    2. Problemas de instalación
    3. Volver al Menu Principal
    
    o escribe si necesitas información de nuestros teclados y monitores.
                            `;
    sock.sendMessage(userId, { text: menuMessage });
  }

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2));
    const msg = m.messages[0];

    if (!msg.key.fromMe) {
      console.log("Respondiendo a", msg.key.remoteJid);
      const userId = msg.key.remoteJid;
      const mensaje = msg.message?.conversation || msg.message.text;
      /*
      const iaRespuesta = await obtenerRespuestaIA(mensaje);

      await sock.sendMessage(msg.key.remoteJid, {
        text: iaRespuesta,
      });
      */

      if (!userContexts[userId]) {
        userContexts[userId] = { menuActual: "main" };
        sendMenuPrincipal(sock, userId);
        return;
      }

      const menuActual = userContexts[userId].menuActual;

      if (menuActual === "main") {
        switch (mensaje) {
          case "1":
            await sock.sendMessage(msg.key.remoteJid, {
              text: "Seleccionaste la opción 1: Productos",
            });
            break;
          case "2":
            userContexts[userId].menuActual = "soporte";
            sendSoporteMenu(sock, userId);
            /*
            const iaRespuesta = await obtenerRespuestaIA(mensaje);

            await sock.sendMessage(msg.key.remoteJid, {
              text: iaRespuesta,
            });
            */
            return;
            break;

          case "3":
            await sock.sendMessage(msg.key.remoteJid, {
              text: "Seleccionaste la opción 3: Contactos",
            });
            break;
          default:
            await sock.sendMessage(msg.key.remoteJid, {
              text: "por favor, elige una opción válida del menú",
            });
            break;
        }
      } else if (menuActual === "soporte") {
        switch (mensaje) {
          case "1":
            await sock.sendMessage(msg.key.remoteJid, {
              text: "Seleccionaste la opción 1: Problemas de inicio de secion",
            });
            break;
          case "2":
            await sock.sendMessage(msg.key.remoteJid, {
              text: "Seleccionaste la opción 2: Problemas de instalción",
            });
            break;

          case "3":
            userContexts[userId].menuActual = "main";
            sendMenuPrincipal(sock, userId);
            return;
            break;
          default:
            const iaRespuesta = await obtenerRespuestaIA(mensaje);

            await sock.sendMessage(msg.key.remoteJid, {
              text: iaRespuesta,
            });
            // await sock.sendMessage(msg.key.remoteJid, {
            //   text: "por favor, elige una opción válida del menú",
            // });
            break;
        }
      }

      // console.log('Obteniendo contactos', Object.values(store.contacts))
      // 59178844793
    }
  });
}

connectToWhatsApp();

const lista_mensajes = [
  {
    role: "system",
    content:
      "Actua como un vendedor y solamente debes ofrecer TECLADO Y MONITORES y llevalo a cerrar una venta, si es otra pregunta responder que no tienes información sobre su pregunta atiende de manera amigable, en menos de 15 palabras",
  },
  { role: "user", content: "Hola" },
  {
    role: "assistant",
    content: "Hola, te envio el catalogo de mis 2 productos",
  },
  { role: "user", content: "precios del teclado" },
  {
    role: "assistant",
    content: "contamos solo con un modelo de $100 dolares",
  },
];

async function obtenerRespuestaIA(mensaje) {
  lista_mensajes.push({
    role: "user",
    content: mensaje,
  });

  const respuesta = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: lista_mensajes,
    },
    {
      headers: {
        Authorization: `Bearer ABCXYZ_TOKEN`,
        "Content-Type": "application/json",
      },
    }
  );

  lista_mensajes.push({
    role: "assistant",
    content: respuesta.data.choices[0].message.content,
  });

  return respuesta.data.choices[0].message.content;
}
