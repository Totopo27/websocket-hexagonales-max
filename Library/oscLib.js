/**
 * oscLib.js - Librería cliente para integración OSC con teclados microtonales
 * Basada en csdosc pero adaptada para el protocolo microtonal WebSocket-OSC
 */

// Variables globales
let oscSocket = null;
let oscConnected = false;
let oscConnectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

/**
 * Inicializar conexión WebSocket
 */
function initOSCConnection(wsUrl = 'ws://localhost:8080') {
    if (oscSocket && oscSocket.readyState === WebSocket.OPEN) {
        console.log('OSC ya está conectado');
        return;
    }

    console.log(`[+] Conectando a ${wsUrl}...`);

    try {
        oscSocket = new WebSocket(wsUrl);

        oscSocket.onopen = function () {
            console.log('[OK] Conectado al puente OSC');
            oscConnected = true;
            oscConnectionAttempts = 0;

            // Mostrar indicador de conexión
            updateOSCStatus(true);
        };

        oscSocket.onclose = function () {
            console.log('[+] OSC desconectado');
            oscConnected = false;
            updateOSCStatus(false);

            // Intentar reconectar
            if (oscConnectionAttempts < MAX_CONNECTION_ATTEMPTS) {
                oscConnectionAttempts++;
                console.log(`[>>] Reintentando conexión (${oscConnectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
                setTimeout(() => initOSCConnection(wsUrl), 3000);
            }
        };

        oscSocket.onerror = function (error) {
            console.error('[XX] Error OSC:', error);
            oscConnected = false;
            updateOSCStatus(false);
        };

        oscSocket.onmessage = function (event) {
            try {
                const message = JSON.parse(event.data);
                console.log('[<<] Mensaje recibido:', message);
            } catch (error) {
                console.error('Error parseando mensaje:', error);
            }
        };

    } catch (error) {
        console.error('[XX] Error creando WebSocket:', error);
    }
}

/**
 * Actualizar indicador visual de estado de conexión
 */
function updateOSCStatus(connected) {
    let statusElement = document.getElementById('osc-connection-status');

    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'osc-connection-status';
        statusElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      transition: all 0.3s ease;
      color: white;
    `;
        document.body.appendChild(statusElement);
    }

    if (connected) {
        statusElement.textContent = '[OK] Max MSP Conectado';
        statusElement.style.backgroundColor = '#2ecc71';
    } else {
        statusElement.textContent = '[!!] Max MSP Desconectado';
        statusElement.style.backgroundColor = '#e74c3c';
    }
}

/**
 * Clase Client - Para enviar mensajes OSC
 */
class OSCClient {
    constructor() {
        this.tetSystem = this.detectTETSystem();
        this.currentOctave = 0;
    }

    detectTETSystem() {
        const title = document.title;
        const tetMatch = title.match(/(\d+)-TET/);
        return tetMatch ? `${tetMatch[1]}-TET` : '31-TET';
    }

    /**
     * Enviar mensaje genérico
     */
    send(message) {
        if (!oscConnected || !oscSocket) {
            console.warn('[!!] OSC no conectado. Mensaje no enviado.');
            return false;
        }

        try {
            oscSocket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[XX] Error enviando mensaje:', error);
            return false;
        }
    }

    /**
     * Enviar nota ON
     */
    sendNoteOn(noteId, frequency, velocity = 127, noteName = '', octave = null) {
        return this.send({
            type: 'note_on',
            noteId: noteId,
            frequency: frequency,
            velocity: velocity,
            noteName: noteName,
            octave: octave !== null ? octave : this.currentOctave,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar nota OFF
     */
    sendNoteOff(noteId, frequency, noteName = '') {
        return this.send({
            type: 'note_off',
            noteId: noteId,
            frequency: frequency,
            velocity: 0,
            noteName: noteName,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar datos de frecuencia
     */
    sendFrequencyData(frequency, noteName, tetPosition, octave = 0) {
        return this.send({
            type: 'frequency_data',
            frequency: frequency,
            noteName: noteName,
            tetPosition: tetPosition,
            octave: octave,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar actualización de polifonía
     */
    sendPolyphonyUpdate(activeNotes) {
        const frequencies = activeNotes.map(note => note.frequency);
        const noteIds = activeNotes.map(note => note.id);

        return this.send({
            type: 'polyphony_update',
            activeNotesCount: activeNotes.length,
            activeFrequencies: frequencies,
            activeNoteIds: noteIds,
            activeNotes: activeNotes,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar cambio de escala
     */
    sendScaleChange(scaleName, scaleNotes = []) {
        return this.send({
            type: 'scale_change',
            scaleName: scaleName,
            scaleNotes: scaleNotes,
            scaleLength: scaleNotes.length,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar cambio de octava
     */
    sendOctaveChange(octaveShift) {
        this.currentOctave = octaveShift;
        return this.send({
            type: 'octave_change',
            octaveShift: octaveShift,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }

    /**
     * Enviar mensaje personalizado
     */
    sendCustomMessage(oscAddress, args) {
        return this.send({
            type: 'custom',
            oscAddress: oscAddress,
            args: args,
            tetSystem: this.tetSystem,
            timestamp: Date.now()
        });
    }
}

/**
 * Clase Server - Para recibir mensajes OSC (placeholder para compatibilidad)
 */
class OSCServer {
    constructor() {
        console.log('OSCServer: Funcionalidad de recepción no implementada en esta versión');
    }

    startServer(port) {
        console.warn('OSCServer.startServer(): No implementado en cliente WebSocket');
    }

    getMessage(callback) {
        console.warn('OSCServer.getMessage(): No implementado en cliente WebSocket');
    }
}

// Crear instancias globales para compatibilidad con csdosc
let oscClient = null;
let oscServer = null;

/**
 * Inicialización automática cuando se carga la página
 */
document.addEventListener('DOMContentLoaded', function () {
    // Iniciar conexión OSC
    initOSCConnection();

    // Crear instancia global del cliente
    oscClient = new OSCClient();
    oscServer = new OSCServer();

    console.log('[OK] oscLib.js cargado - Cliente OSC listo');
    console.log(`   Sistema TET detectado: ${oscClient.tetSystem}`);
});

// Exportar para uso global
window.OSCClient = OSCClient;
window.OSCServer = OSCServer;
window.initOSCConnection = initOSCConnection;
window.oscClient = oscClient;
window.oscServer = oscServer;
