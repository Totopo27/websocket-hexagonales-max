const WebSocket = require('ws');
const osc = require('osc');

// Configuración
const WS_PORT = 8080;
const OSC_LOCAL_PORT = 57121;
const OSC_MAX_HOST = '127.0.0.1';
const OSC_MAX_PORT = 57120;

console.log('🎹 WebSocket-OSC Bridge para Teclados Microtonales');
console.log('==================================================');

// Crear puerto UDP OSC
const oscPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: OSC_LOCAL_PORT,
    remoteAddress: OSC_MAX_HOST,
    remotePort: OSC_MAX_PORT,
    metadata: true
});

// Abrir puerto OSC
oscPort.open();

oscPort.on("ready", function () {
    console.log(`✅ Puerto OSC abierto en puerto ${OSC_LOCAL_PORT}`);
    console.log(`📡 Enviando a Max MSP en ${OSC_MAX_HOST}:${OSC_MAX_PORT}`);
});

// Crear servidor WebSocket
const wss = new WebSocket.Server({ 
    port: WS_PORT,
    perMessageDeflate: false // Mejor rendimiento para tiempo real
});

console.log(`🌐 Servidor WebSocket iniciado en puerto ${WS_PORT}`);

// Contador de clientes conectados
let connectedClients = 0;

wss.on('connection', function connection(ws, req) {
    connectedClients++;
    const clientIP = req.socket.remoteAddress;
    
    console.log(`🔌 Cliente conectado desde ${clientIP} (Total: ${connectedClients})`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    // Enviar mensaje de bienvenida
    const welcomeMessage = {
        type: 'connection',
        status: 'connected',
        message: 'Conectado al puente OSC',
        timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(welcomeMessage));
    console.log(`📤 Mensaje de bienvenida enviado al cliente: ${clientIP}`);

    ws.on('message', function incoming(data) {
        try {
            const message = JSON.parse(data);
            
            // Log detallado del mensaje recibido
            console.log(`\n📨 ========= MENSAJE RECIBIDO =========`);
            console.log(`🕒 Tiempo: ${new Date().toISOString()}`);
            console.log(`👤 Cliente: ${clientIP}`);
            console.log(`📋 Tipo: ${message.type}`);
            console.log(`📦 Contenido completo:`, JSON.stringify(message, null, 2));
            
            // Procesar diferentes tipos de mensajes
            switch(message.type) {
                case 'note_on':
                    console.log(`🎹 NOTE_ON - ID:${message.noteId} Freq:${message.frequency}Hz Vel:${message.velocity} Nota:${message.noteName} Sistema:${message.tetSystem}`);
                    handleNoteOn(message);
                    break;
                case 'note_off':
                    console.log(`🎹 NOTE_OFF - ID:${message.noteId} Freq:${message.frequency}Hz Nota:${message.noteName} Sistema:${message.tetSystem}`);
                    handleNoteOff(message);
                    break;
                case 'frequency_data':
                    console.log(`🎵 FREQ_DATA - ${message.frequency}Hz ${message.noteName} Pos:${message.tetPosition} Oct:${message.octave}`);
                    handleFrequencyData(message);
                    break;
                case 'polyphony_update':
                    console.log(`🎼 POLYPHONY - ${message.activeNotesCount} notas activas`);
                    handlePolyphonyUpdate(message);
                    break;
                case 'scale_change':
                    console.log(`🎶 SCALE_CHANGE - ${message.scaleName} (${message.tetSystem})`);
                    handleScaleChange(message);
                    break;
                case 'octave_change':
                    console.log(`🎚️ OCTAVE_CHANGE - Shift:${message.octaveShift} (${message.tetSystem})`);
                    handleOctaveChange(message);
                    break;
                case 'custom':
                    console.log(`🔧 CUSTOM - ${message.oscAddress}`);
                    handleCustomMessage(message);
                    break;
                default:
                    console.log(`⚠️  TIPO DESCONOCIDO: ${message.type}`);
                    console.log(`📦 Datos:`, message);
            }
            
            console.log(`✅ Mensaje procesado exitosamente\n`);
            
        } catch (error) {
            console.error(`\n❌ ========= ERROR PROCESANDO MENSAJE =========`);
            console.error(`🕒 Tiempo: ${new Date().toISOString()}`);
            console.error(`👤 Cliente: ${clientIP}`);
            console.error(`📦 Datos recibidos:`, data.toString());
            console.error(`🚨 Error:`, error.message);
            console.error(`📍 Stack:`, error.stack);
            console.error(`===============================================\n`);
            
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
        console.log(`🔌 Cliente desconectado (Total: ${connectedClients})`);
    });

    ws.on('error', function error(err) {
        console.error('❌ Error WebSocket:', err);
    });
});

// Handlers para diferentes tipos de mensajes

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
    
    console.log(`📡 ========= ENVIANDO OSC A MAX MSP =========`);
    console.log(`🎯 Dirección: ${oscMessage.address}`);
    console.log(`📊 Argumentos:`);
    oscMessage.args.forEach((arg, index) => {
        console.log(`   ${index}: ${arg.type} = ${arg.value}`);
    });
    console.log(`🌐 Destino: ${OSC_MAX_HOST}:${OSC_MAX_PORT}`);
    
    try {
        oscPort.send(oscMessage);
        console.log(`✅ OSC enviado exitosamente`);
    } catch (error) {
        console.error(`❌ Error enviando OSC:`, error);
    }
    console.log(`==========================================\n`);
}

function handleNoteOff(message) {
    const oscMessage = {
        address: "/microtonal/note_off",
        args: [
            { type: "i", value: message.noteId || 0 },
            { type: "f", value: message.frequency || 440.0 },
            { type: "f", value: 0 }, // Velocity siempre 0 al liberar
            { type: "s", value: message.tetSystem || "31-TET" },
            { type: "s", value: message.noteName || "C" }
        ]
    };
    
    console.log(`📡 ENVIANDO OSC NOTE_OFF: ${oscMessage.address}`);
    console.log(`📊 ID:${oscMessage.args[0].value} Freq:${oscMessage.args[1].value} Vel:${oscMessage.args[2].value}`);
    
    try {
        oscPort.send(oscMessage);
        console.log(`✅ NOTE_OFF enviado`);
    } catch (error) {
        console.error(`❌ Error enviando NOTE_OFF:`, error);
    }
}

function handleFrequencyData(message) {
    // /microtonal/freq_data [frequency] [note_name] [tet_position] [octave]
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
    // /microtonal/polyphony [active_notes_count] [frequencies_array]
    const frequencies = message.activeFrequencies || [];
    const noteIds = message.activeNoteIds || [];
    
    oscPort.send({
        address: "/microtonal/polyphony",
        args: [
            { type: "i", value: message.activeNotesCount || 0 },
            { type: "s", value: message.tetSystem || "31-TET" }
        ]
    });
    
    // Enviar cada frecuencia activa individualmente
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
    // /microtonal/scale [scale_name] [scale_notes_array] [tet_system]
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
    // /microtonal/octave [octave_shift] [tet_system]
    oscPort.send({
        address: "/microtonal/octave",
        args: [
            { type: "i", value: message.octaveShift || 0 },
            { type: "s", value: message.tetSystem || "31-TET" }
        ]
    });
}

function handleCustomMessage(message) {
    // Mensaje personalizado con dirección OSC definida por el usuario
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

// Manejo de errores del puerto OSC
oscPort.on("error", function (error) {
    console.error("❌ Error OSC:", error);
});

// Función para cerrar limpiamente
process.on('SIGINT', function() {
    console.log('\n🛑 Cerrando servidor...');
    oscPort.close();
    process.exit();
});

console.log('\n📋 Direcciones OSC disponibles:');
console.log('   /microtonal/note_on - Nota presionada (con velocity)');
console.log('   /microtonal/note_off - Nota liberada (velocity=0)'); 
console.log('   /microtonal/freq_data - Datos de frecuencia');
console.log('   /microtonal/polyphony - Estado polifónico');
console.log('   /microtonal/scale - Cambio de escala');
console.log('   /microtonal/octave - Cambio de octava');
console.log('   /microtonal/custom - Mensajes personalizados');
console.log('\n🎯 Conéctate desde tu teclado web a: ws://localhost:8080');
