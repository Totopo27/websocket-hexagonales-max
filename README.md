# Servidor Unificado WebSocket-OSC para Teclados Microtonales

**Versión 2.0** - Servidor completo HTTP+WebSocket+OSC para teclados microtonales con integración Max MSP.

## Características

- **Servidor HTTP** integrado (puerto 8001) - sirve teclados microtonales directamente
- **Servidor WebSocket** (puerto 8080) - comunicación en tiempo real
- **Puente OSC** hacia Max MSP (puerto 57120)
- **Página de inicio** con listado automático de proyectos
- **Librería cliente** reutilizable (`Library/oscLib.js`)
- **Logging configurable** - modo normal o verbose
- **Auto-reconexión** y manejo robusto de errores
- **Tema oscuro/claro** - Paleta de colores personalizable

## Funcionamiento

```
[Navegador] -> [HTTP:8001] -> [Teclado Web]
     |
[WebSocket:8080] -> [Servidor Node.js] -> [OSC:57120] -> [Max MSP]
```

1. **Servidor HTTP**: Sirve los teclados microtonales (HTML/CSS/JS)
2. **Cliente WebSocket**: Envía eventos musicales desde el navegador
3. **Puente OSC**: Convierte mensajes WebSocket a protocolo OSC
4. **Max MSP**: Recibe y procesa los mensajes para síntesis

## Instalación Rápida

### Paso 1: Instalar Node.js
- Descarga e instala Node.js desde https://nodejs.org
- Versión recomendada: 14.0 o superior

### Paso 2: Instalar dependencias
```bash
cd webSocketOSC
npm install
```

### Paso 3: Iniciar servidor
```bash
npm start
```

Verás:
```
Servidor Unificado WebSocket-OSC para Teclados Microtonales
================================================================
[OK] Servidor HTTP iniciado en puerto 8001
     Accede a: http://localhost:8001
[OK] Servidor WebSocket iniciado en puerto 8080
[OK] Puerto OSC abierto en puerto 57121
[->] Enviando a Max MSP en 127.0.0.1:57120

[**] Servidor listo para recibir conexiones
```

### Paso 4: Abrir en navegador
Abre tu navegador en: **http://localhost:8001**

Verás la página de inicio con todos los proyectos de teclados disponibles.

### Paso 5: Configurar Max MSP
1. Abre Max MSP
2. Carga el patch `microtonalOSCReceiver.maxpat`
3. Haz clic en "port 57120" para activar la recepción OSC
4. Conecta los outlets según tus necesidades

## Configuración de Puertos

### Puertos por defecto:
- **HTTP**: 8001 (servidor web)
- **WebSocket**: 8080 (comunicación en tiempo real)
- **OSC salida**: 57120 (hacia Max MSP)
- **OSC entrada**: 57121 (servidor local)

### Cambiar puertos (opcional):
En `websocket-osc-server.js`:
```javascript
const HTTP_PORT = 8001;        // Puerto HTTP
const WS_PORT = 8080;          // Puerto WebSocket
const OSC_MAX_PORT = 57120;    // Puerto Max MSP
const OSC_LOCAL_PORT = 57121;  // Puerto servidor local
```

## Uso con Teclados Existentes

### Opción 1: Usar Library/oscLib.js (Recomendado)

Añade a tu HTML:
```html
<script src="/Library/oscLib.js"></script>
<script src="tu-codigo.js"></script>
```

En tu JavaScript:
```javascript
// oscLib.js se conecta automáticamente al cargar la página

// Usar el cliente global
oscClient.sendNoteOn(noteId, frequency, 127, noteName, octave);
oscClient.sendNoteOff(noteId, frequency, noteName);
oscClient.sendScaleChange('ionian');
oscClient.sendOctaveChange(1);
```

### Opción 2: Integración manual con microtonal-websocket-client.js

```html
<script src="/microtonal-websocket-client.js"></script>
```

```javascript
// Crear cliente
const bridge = createMicrotonalOSCBridge({
    wsUrl: 'ws://localhost:8080',
    tetSystem: '31-TET'
});

// Enviar eventos
bridge.sendNoteOn(noteId, frequency, velocity, noteName, octave);
bridge.sendNoteOff(noteId, frequency, noteName);
bridge.sendPolyphonyUpdate(activeNotes);
bridge.sendScaleChange('ionian');
bridge.sendOctaveChange(1);
```

## Mensajes OSC Disponibles

### `/microtonal/note_on`
**Argumentos**: `note_id(int)` `frequency(float)` `velocity(float)` `tet_system(string)` `octave(int)` `note_name(string)`

**Ejemplo**: `/microtonal/note_on 5 261.63 127 "31-TET" 0 "C"`

### `/microtonal/note_off`
**Argumentos**: `note_id(int)` `frequency(float)` `velocity(float)` `tet_system(string)` `note_name(string)`

**Ejemplo**: `/microtonal/note_off 5 261.63 0 "31-TET" "C"`

**Nota**: El velocity siempre es 0 para indicar liberación de tecla.

### `/microtonal/polyphony`
**Argumentos**: `active_count(int)` `tet_system(string)`

**Ejemplo**: `/microtonal/polyphony 3 "31-TET"`

### `/microtonal/polyphony/note`
**Argumentos**: `index(int)` `frequency(float)` `note_id(int)`

**Ejemplo**: `/microtonal/polyphony/note 0 261.63 5`

### `/microtonal/freq_data`
**Argumentos**: `frequency(float)` `note_name(string)` `tet_position(int)` `octave(int)` `tet_system(string)`

**Ejemplo**: `/microtonal/freq_data 261.63 "C" 0 4 "31-TET"`

### `/microtonal/scale`
**Argumentos**: `scale_name(string)` `tet_system(string)` `scale_length(int)`

**Ejemplo**: `/microtonal/scale "ionian" "31-TET" 7`

### `/microtonal/octave`
**Argumentos**: `octave_shift(int)` `tet_system(string)`

**Ejemplo**: `/microtonal/octave 1 "31-TET"`

### `/microtonal/custom`
**Argumentos**: Variables según definición del usuario

**Ejemplo**: Usuario puede definir `/microtonal/harmony/chord` con argumentos personalizados

## Ejemplos de Uso en Max MSP

### Síntesis básica
```
[udpreceive 57120] -> [oscroute /microtonal] -> [oscroute note_on] -> [unpack i f f s i s] -> [cycle~] -> [*~] -> [dac~]
```

### Polifonía
```
[poly~ mi_sintetizador 16] <- [pack i f f] <- [oscroute note_on]
```

### Control de efectos
```
[oscroute scale] -> [route ionian dorian] -> [diferentes reverbs/delays]
```

### Análisis harmónico
```
[oscroute polyphony/note] -> [collect] -> [análisis_espectral]
```

## Personalización

### Añadir mensajes OSC personalizados
En el cliente web:
```javascript
bridge.sendCustomMessage('/microtonal/harmony/tension', [
    {type: 'f', value: tensionLevel},
    {type: 's', value: chordType},
    {type: 'i', value: dissonanceIndex}
]);
```

### Cambiar tema (oscuro/claro)
El servidor incluye un botón de tema en la esquina superior derecha que permite alternar entre modo oscuro y claro. La preferencia se guarda en localStorage.

## Solución de Problemas

### No se conecta el WebSocket
1. Verificar que el servidor esté corriendo: `npm start`
2. Verificar puerto en navegador: `ws://localhost:8080`
3. Revisar firewall/antivirus

### Max MSP no recibe mensajes
1. Verificar puerto OSC: `port 57120`
2. Comprobar `udpreceive` activo
3. Verificar rutas OSC con `print`

### Latencia alta
1. Usar `perMessageDeflate: false` en WebSocket
2. Optimizar procesamiento en Max MSP
3. Reducir mensajes innecesarios

### Conexión se cae frecuentemente
1. Activar auto-reconexión (habilitado por defecto)
2. Verificar estabilidad de red
3. Ajustar `maxReconnectAttempts`

## Rendimiento

### Optimizaciones recomendadas:
- **WebSocket**: Descompresión deshabilitada para tiempo real
- **OSC**: Mensajes binarios optimizados  
- **Max MSP**: Usar `poly~` para polifonía eficiente
- **Navegador**: Evitar envío de mensajes redundantes

### Métricas típicas:
- **Latencia**: < 5ms en red local
- **Throughput**: > 1000 mensajes/segundo
- **CPU**: < 5% en servidor Node.js



