const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.Server(app);
const WebSocket = require('ws');
const osc = require('osc');
const fs = require('fs');
const os = require('os');

// Configuración
const HTTP_PORT = 8001;
const WS_PORT = 8080;
const OSC_LOCAL_PORT = 57121;
const OSC_MAX_HOST = '127.0.0.1';
const OSC_MAX_PORT = 57120;

// Modo de logging (false = menos verboso, true = muy detallado)
const VERBOSE_LOGGING = false;

console.log('Servidor Unificado WebSocket-OSC para Teclados Microtonales');
console.log('================================================================');

// ============================================
// SERVIDOR HTTP/EXPRESS
// ============================================

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(path.join(__dirname, '/')));

// Función para generar página HTML
function printPage(body) {
  return `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <title>Servidor Microtonal WebSocket-OSC</title>
      <link rel="stylesheet" href="/Library/style.css" />
    </head>
    <body>
      <button id="theme-toggle" class="theme-toggle">Modo: Oscuro</button>
      ${body}
      <script src="/Library/theme.js"></script>
    </body>
  </html>`;
}

// Función para generar lista de archivos/directorios
function generateFileList(folderPath, options = {}) {
  const stats = fs.statSync(folderPath);
  const ignorableNames = [
    /.git$/,
    /^\/node_modules$/,
    /^\/Library$/,
    /^\\node_modules$/,
    /^\\Library$/,
    /^\/package(-lock)?.json$/,
    /^\/websocket-osc-bridge\.js$/,
    /^\/websocket-osc-server\.js$/,
    /^\/microtonal-websocket-client\.js$/,
    /^\/README\.md$/,
    /^\/microtonalOSCReceiver\.maxpat$/,
    /^\/test-websocket-connection\.html$/,
    /.DS_Store$/,
    /.gitignore$/,
  ];

  const showHidden = options.showHidden || false;
  const showFiles = options.showFiles || false;

  const isRoot = path.join(folderPath, '/.') === path.join(__dirname, '/.');

  if (!stats.isDirectory()) return '';

  const folderContent = fs.readdirSync(folderPath, { withFileTypes: true }).filter((e) => {
    const filePath = path.join(folderPath, e.name).replace(__dirname, '');
    for (const ignorableName of ignorableNames) {
      if (ignorableName.test(filePath)) return false;
    }
    return true;
  });

  const mappedContent = folderContent.map((e) => {
    const filePath = path.join(folderPath, e.name);
    const fileStats = fs.statSync(filePath);
    return {
      name: e.name,
      path: filePath,
      extension: path.extname(filePath).replace('.', ''),
      isDirectory: fileStats.isDirectory(),
      isHidden: (/(^|\/)\.[^\/\.]/g).test(e.name)
    };
  });

  const filteredContent = mappedContent.filter((e) => {
    return (showHidden || !e.isHidden) && (showFiles || e.isDirectory);
  });

  if (!isRoot) {
    filteredContent.unshift({
      name: "..",
      path: path.join(folderPath, ".."),
      extension: "",
      isDirectory: true,
      isHidden: false,
    });
  }

  const tableRows = filteredContent.map((e) => `<tr class="entryRow" onclick="window.location='${e.name}';"><td>${e.name}</td></tr>`).join('\n');

  return `
    <table class="folderTable card">
    <tr><th>Proyectos Disponibles</th></tr>
    ${tableRows}
    </table>`;
}

// Middleware para manejar rutas
app.use(function (req, res, next) {
  const fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
  const filePath = path.join(__dirname, req.originalUrl);
  const exists = fs.existsSync(filePath);
  let response = '';
  let httpStatus = 200;

  if (!exists) {
    response = `<div class="card padding text-center">
      <h2>Error!</h2><br>
      La página <b>${fullUrl}</b> no existe. ¿Has escrito bien la dirección?
    </div>`;
    httpStatus = 404;
  } else {
    const fileList = generateFileList(filePath, {
      showHidden: false,
      showFiles: false,
    });

    if (req.originalUrl === "/") {
      response = `<div class="card padding text-center">
        <h1>Servidor Microtonal WebSocket-OSC</h1>
        <p>Servidor unificado para teclados microtonales con integración Max MSP</p>
        <br>
        <div class="info-box">
          <h3>Estado del Servidor</h3>
          <p><strong>HTTP:</strong> Puerto ${HTTP_PORT}</p>
          <p><strong>WebSocket:</strong> Puerto ${WS_PORT}</p>
          <p><strong>OSC a Max MSP:</strong> ${OSC_MAX_HOST}:${OSC_MAX_PORT}</p>
          <p><strong>OSC Local:</strong> Puerto ${OSC_LOCAL_PORT}</p>
        </div>
        <br>
        <p>Selecciona un proyecto de teclado microtonal para comenzar:</p>
      </div>${fileList}`;
    } else {
      response = `<div class="card padding">Contenido de la carpeta: <b>${fullUrl}</b></div>${fileList}`;
    }
  }
  if (response !== '') res.status(httpStatus).send(printPage(response));
  else next();
});

// Iniciar servidor HTTP
server.listen(HTTP_PORT, function () {
  console.log(`[OK] Servidor HTTP iniciado en puerto ${HTTP_PORT}`);
  console.log(`     Accede a: http://localhost:${HTTP_PORT}`);

  if (os.release().includes('WSL2')) {
    let addresses = os.networkInterfaces()['eth0'];
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].family === 'IPv4') {
        console.log(`     WSL2 IP: ${addresses[i].address}:${HTTP_PORT}`);
      }
    }
  }
});

// ============================================
// SERVIDOR WEBSOCKET
// ============================================

const wss = new WebSocket.Server({
  port: WS_PORT,
  perMessageDeflate: false
});

console.log(`[OK] Servidor WebSocket iniciado en puerto ${WS_PORT}`);

// ============================================
// PUERTO OSC
// ============================================

const oscPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: OSC_LOCAL_PORT,
  remoteAddress: OSC_MAX_HOST,
  remotePort: OSC_MAX_PORT,
  metadata: true
});

oscPort.open();

oscPort.on("ready", function () {
  console.log(`[OK] Puerto OSC abierto en puerto ${OSC_LOCAL_PORT}`);
  console.log(`[->] Enviando a Max MSP en ${OSC_MAX_HOST}:${OSC_MAX_PORT}`);
  console.log('');
  console.log('[**] Servidor listo para recibir conexiones');
  console.log('================================================================\n');
});

// ============================================
// MANEJO DE CONEXIONES WEBSOCKET
// ============================================

let connectedClients = 0;

wss.on('connection', function connection(ws, req) {
  connectedClients++;
  const clientIP = req.socket.remoteAddress;

  console.log(`[+] Cliente conectado desde ${clientIP} (Total: ${connectedClients})`);

  const welcomeMessage = {
    type: 'connection',
    status: 'connected',
    message: 'Conectado al puente OSC',
    timestamp: Date.now()
  };

  ws.send(JSON.stringify(welcomeMessage));

  ws.on('message', function incoming(data) {
    try {
      const message = JSON.parse(data);

      if (VERBOSE_LOGGING) {
        console.log(`\n[<<] MENSAJE: ${message.type} de ${clientIP}`);
        console.log(`[..] Datos:`, JSON.stringify(message, null, 2));
      }

      switch (message.type) {
        case 'note_on':
          if (!VERBOSE_LOGGING) {
            console.log(`[>>] NOTE_ON: ${message.noteName} (${message.frequency?.toFixed(2)}Hz) - ${message.tetSystem}`);
          }
          handleNoteOn(message);
          break;
        case 'note_off':
          if (!VERBOSE_LOGGING) {
            console.log(`[>>] NOTE_OFF: ${message.noteName} (${message.frequency?.toFixed(2)}Hz)`);
          }
          handleNoteOff(message);
          break;
        case 'frequency_data':
          handleFrequencyData(message);
          break;
        case 'polyphony_update':
          if (!VERBOSE_LOGGING) {
            console.log(`[>>] POLYPHONY: ${message.activeNotesCount} notas activas`);
          }
          handlePolyphonyUpdate(message);
          break;
        case 'scale_change':
          console.log(`[>>] SCALE: ${message.scaleName} (${message.tetSystem})`);
          handleScaleChange(message);
          break;
        case 'octave_change':
          console.log(`[>>] OCTAVE: ${message.octaveShift > 0 ? '+' : ''}${message.octaveShift}`);
          handleOctaveChange(message);
          break;
        case 'custom':
          handleCustomMessage(message);
          break;
        default:
          console.log(`[!!] Tipo desconocido: ${message.type}`);
      }

    } catch (error) {
      console.error(`[XX] Error procesando mensaje de ${clientIP}:`, error.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error procesando mensaje',
        error: error.message,
        timestamp: Date.now()
      }));
    }
  });

  ws.on('close', function close() {
    connectedClients--;
    console.log(`[-] Cliente desconectado (Total: ${connectedClients})`);
  });

  ws.on('error', function error(err) {
    console.error('[XX] Error WebSocket:', err.message);
  });
});

// ============================================
// HANDLERS OSC
// ============================================

function handleNoteOn(message) {
  const oscMessage = {
    address: "/microtonal/note_on",
    args: [
      { type: "i", value: message.noteId || 0 },
      { type: "f", value: message.frequency || 440.0 },
      { type: "f", value: message.velocity || 127 },
      { type: "s", value: message.tetSystem || "31-TET" },
      { type: "i", value: message.octave || 0 },
      { type: "s", value: message.noteName || "C" }
    ]
  };

  try {
    oscPort.send(oscMessage);
    if (VERBOSE_LOGGING) {
      console.log(`[OK] OSC enviado: ${oscMessage.address}`);
    }
  } catch (error) {
    console.error(`[XX] Error enviando OSC:`, error.message);
  }
}

function handleNoteOff(message) {
  const oscMessage = {
    address: "/microtonal/note_off",
    args: [
      { type: "i", value: message.noteId || 0 },
      { type: "f", value: message.frequency || 440.0 },
      { type: "f", value: 0 },
      { type: "s", value: message.tetSystem || "31-TET" },
      { type: "s", value: message.noteName || "C" }
    ]
  };

  try {
    oscPort.send(oscMessage);
  } catch (error) {
    console.error(`[XX] Error enviando NOTE_OFF:`, error.message);
  }
}

function handleFrequencyData(message) {
  oscPort.send({
    address: "/microtonal/freq_data",
    args: [
      { type: "f", value: message.frequency || 440.0 },
      { type: "s", value: message.noteName || "C" },
      { type: "i", value: message.tetPosition || 0 },
      { type: "i", value: message.octave || 0 },
      { type: "s", value: message.tetSystem || "31-TET" }
    ]
  });
}

function handlePolyphonyUpdate(message) {
  const frequencies = message.activeFrequencies || [];
  const noteIds = message.activeNoteIds || [];

  oscPort.send({
    address: "/microtonal/polyphony",
    args: [
      { type: "i", value: message.activeNotesCount || 0 },
      { type: "s", value: message.tetSystem || "31-TET" }
    ]
  });

  frequencies.forEach((freq, index) => {
    oscPort.send({
      address: "/microtonal/polyphony/note",
      args: [
        { type: "i", value: index },
        { type: "f", value: freq },
        { type: "i", value: noteIds[index] || 0 }
      ]
    });
  });
}

function handleScaleChange(message) {
  oscPort.send({
    address: "/microtonal/scale",
    args: [
      { type: "s", value: message.scaleName || "chromatic" },
      { type: "s", value: message.tetSystem || "31-TET" },
      { type: "i", value: message.scaleLength || 12 }
    ]
  });
}

function handleOctaveChange(message) {
  oscPort.send({
    address: "/microtonal/octave",
    args: [
      { type: "i", value: message.octaveShift || 0 },
      { type: "s", value: message.tetSystem || "31-TET" }
    ]
  });
}

function handleCustomMessage(message) {
  const address = message.oscAddress || "/microtonal/custom";
  const args = message.args || [];

  oscPort.send({
    address: address,
    args: args.map(arg => ({
      type: arg.type || "f",
      value: arg.value || 0
    }))
  });
}

// ============================================
// MANEJO DE ERRORES Y CIERRE
// ============================================

oscPort.on("error", function (error) {
  console.error("[XX] Error OSC:", error.message);
});

process.on('SIGINT', function () {
  console.log('\n[--] Cerrando servidor...');
  oscPort.close();
  wss.close();
  server.close();
  process.exit();
});

process.on('uncaughtException', function (err) {
  console.error('[XX] Error no capturado:', err.message);
});
