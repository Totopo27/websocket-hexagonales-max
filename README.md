# WebSocket-OSC Bridge para Teclados Microtonales

Sistema completo para conectar teclados microtonales web (19-TET, 31-TET, 41-TET, 53-TET) con Max MSP mediante WebSocket y protocolo OSC.

## 🎯 Funcionamiento

```
[Teclado Web] → [WebSocket] → [Servidor Node.js] → [OSC] → [Max MSP]
```

1. **Teclado Web**: Genera frecuencias microtonales y eventos
2. **Cliente WebSocket**: Envía datos desde el navegador
3. **Servidor Bridge**: Convierte WebSocket a OSC
4. **Max MSP**: Recibe mensajes OSC para síntesis y procesamiento

## 🚀 Instalación

### Paso 1: Instalar Node.js
- Descarga e instala Node.js desde https://nodejs.org
- Versión recomendada: 14.0 o superior

### Paso 2: Configurar el servidor
```bash
# Crear directorio del proyecto
mkdir microtonal-bridge
cd microtonal-bridge

# Descargar los archivos:
# - websocket-osc-bridge.js
# - package.json
# - microtonal-websocket-client.js

# Instalar dependencias
npm install

# Iniciar servidor
npm start
```

### Paso 3: Configurar Max MSP
1. Abre Max MSP
2. Carga el patch `MicrotonalOSCReceiver.maxpat`
3. Haz clic en "port 57120" para activar la recepción OSC
4. Conecta los outlets según tus necesidades

### Paso 4: Integrar con teclados web
Añade a tus archivos HTML existentes:

```html
<script src="microtonal-websocket-client.js"></script>
```

## 📡 Configuración de Puertos

### Puertos por defecto:
- **WebSocket**: 8080
- **OSC salida**: 57120 (hacia Max MSP)
- **OSC entrada**: 57121 (servidor local)

### Cambiar puertos (opcional):
En `websocket-osc-bridge.js`:
```javascript
const WS_PORT = 8080;          // Puerto WebSocket
const OSC_MAX_PORT = 57120;    // Puerto Max MSP
const OSC_LOCAL_PORT = 57121;  // Puerto servidor local
```

## 🎹 Uso con Teclados Existentes

### Integración automática
Si tu HTML contiene:
- Título con "X-TET" (ej: "Teclado 31-TET")
- Función `playNote()` existente

La integración se activa automáticamente al cargar la página.

### Integración manual
```javascript
// Crear cliente
const bridge = createMicrotonalOSCBridge({
    wsUrl: 'ws://localhost:8080',
    tetSystem: '31-TET'
});

// Enviar nota
bridge.sendNoteOn(noteId, frequency, velocity, noteName, octave);
bridge.sendNoteOff(noteId, frequency, noteName);

// Otros eventos
bridge.sendPolyphonyUpdate(activeNotes);
bridge.sendScaleChange('ionian');
bridge.sendOctaveChange(1);
```

## 📋 Mensajes OSC Disponibles

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

## 🎛️ Ejemplos de Uso en Max MSP

### Síntesis básica
```
[udpreceive 57120] → [oscroute /microtonal] → [oscroute note_on] → [unpack i f f s i s] → [cycle~] → [*~] → [dac~]
```

### Polifonía
```
[poly~ mi_sintetizador 16] ← [pack i f f] ← [oscroute note_on]
```

### Control de efectos
```
[oscroute scale] → [route ionian dorian] → [diferentes reverbs/delays]
```

### Análisis harmónico
```
[oscroute polyphony/note] → [collect] → [análisis_espectral]
```

## 🔧 Personalización

### Añadir mensajes OSC personalizados
En el cliente web:
```javascript
bridge.sendCustomMessage('/microtonal/harmony/tension', [
    {type: 'f', value: tensionLevel},
    {type: 's', value: chordType},
    {type: 'i', value: dissonanceIndex}
]);
```

### Modificar frecuencias base
En tus teclados web:
```javascript
// Cambiar frecuencia base A4
const BASE_FREQ = 440.0; // Estándar
// const BASE_FREQ = 432.0; // Alternativo
```

## 🐛 Solución de Problemas

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

## 📈 Rendimiento

### Optimizaciones recomendadas:
- **WebSocket**: Descompresión deshabilitada para tiempo real
- **OSC**: Mensajes binarios optimizados  
- **Max MSP**: Usar `poly~` para polifonía eficiente
- **Navegador**: Evitar envío de mensajes redundantes

### Métricas típicas:
- **Latencia**: < 5ms en red local
- **Throughput**: > 1000 mensajes/segundo
- **CPU**: < 5% en servidor Node.js

## 🎼 Sistemas Soportados

| Sistema TET | Notas/Octava | Archivo Ejemplo |
|-------------|--------------|-----------------|
| 19-TET      | 19           | keyboard-19tet.html |
| 31-TET      | 31           | keyboard-31tet.html |
| 41-TET      | 41           | keyboard-41tet.html |
| 53-TET      | 53           | keyboard-53tet.html |

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-caracteristica`
3. Commit: `git commit -m 'Añadir nueva característica'`
4. Push: `git push origin feature/nueva-caracteristica`
5. Pull Request

## 📄 Licencia

MIT License - Usar, modificar y distribuir libremente.

## 📞 Soporte

- **Issues**: GitHub Issues
- **Discord**: Servidor de Audio/Música Programática
- **Email**: [tu-email@ejemplo.com]

---

**¡Disfruta explorando la música microtonal con Max MSP!** 🎵
