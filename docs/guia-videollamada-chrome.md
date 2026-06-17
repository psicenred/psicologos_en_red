# Guía: Problema de videollamada solo en Chrome

**Para:** Psicólogos en Red (si la videollamada falla en Chrome pero funciona en Safari o en el celular)

**Problema:** Al dar clic en "Iniciar Sesión" o "Unirse" en Chrome aparece un error y no se enciende la cámara. El mensaje puede decir algo como "Error al cargar la videollamada" o verse un error técnico en la consola.

---

## Pasos a seguir (en orden)

### 1. Probar en modo incógnito de Chrome

1. En Chrome, abre un **nuevo menú** (tres puntitos arriba a la derecha).
2. Elige **"Nueva ventana de incógnito"** (o escribe `Ctrl+Shift+N` en Windows / `Cmd+Shift+N` en Mac).
3. En esa ventana, entra de nuevo a Psicólogos en Red e inicia sesión.
4. Ve a tu panel, abre la cita y pulsa **"Iniciar Sesión"** para la videollamada.

**¿Funcionó en incógnito?**
- **Sí** → Es muy probable que una **extensión** de Chrome esté causando el problema. Sigue con el paso 2.
- **No** → Anota "No funcionó en incógnito" y sigue con el paso 3.

---

### 2. Revisar extensiones de Chrome (si en incógnito sí funcionó)

1. En la barra de direcciones de Chrome escribe: `chrome://extensions/` y pulsa Enter.
2. Anota **qué extensiones tienes instaladas** (nombres). Puedes hacer una captura de pantalla de esa página.
3. Las que más suelen afectar son: bloqueadores de anuncios (AdBlock, uBlock, etc.), extensiones de privacidad o de bloqueo de rastreadores.
4. **Prueba desactivando** las extensiones una por una (quitar el interruptor para que queden en gris), y después de desactivar cada una, **recarga la página del panel** e intenta de nuevo "Iniciar Sesión".
5. Cuando encuentres la extensión que al desactivarla hace que funcione la videollamada, anota su **nombre exacto**.

**Qué regresar:** Lista de extensiones que tienes y, si encontraste la que causa el problema, el nombre de esa extensión.

---

### 3. Permisos de cámara y micrófono en Chrome

1. Entra a la página del **panel de Psicólogos en Red** (donde das clic a "Iniciar Sesión").
2. Haz clic en el **candado** o el ícono de "información" a la izquierda de la dirección (donde dice `https://...`).
3. Busca **"Cámara"** y **"Micrófono"**.
4. Asegúrate de que estén en **"Permitir"**. Si están en "Bloquear" o "Preguntar", cámbialos a **Permitir** y recarga la página.
5. Vuelve a intentar "Iniciar Sesión".

**Qué regresar:** Si estaban en Bloquear o Preguntar, dime que los cambiaste a Permitir y si después de eso funcionó o no.

---

### 4. Versión de Chrome y sistema

1. En Chrome, abre el menú (tres puntitos) → **Ayuda** → **Información de Google Chrome**.
2. Anota la **versión** (ejemplo: "120.0.6099.129").
3. Anota también **sistema operativo** (Windows 10, Windows 11, Mac, etc.).

**Qué regresar:** Número de versión de Chrome y sistema operativo (Windows/Mac y versión si la sabes).

---

### 5. Si usas Chrome del trabajo o de una institución

Si el Chrome que usas es el de tu trabajo, universidad o institución (te lo instaló o configuró el área de sistemas):

- Prueba en **otro equipo** o en **tu Chrome personal** (tu propia cuenta de Google en casa).
- Si en tu Chrome personal **sí funciona**, el problema puede ser una **política de seguridad** del Chrome del trabajo que bloquea la videollamada.

**Qué regresar:** "Uso Chrome del trabajo/institución" y si en Chrome personal o en otro equipo sí funcionó.

---

## Si después de todo sigue sin funcionar: qué enviar

Copia o captura y envía lo siguiente (puedes pegarlo en un correo o mensaje):

### A) Resumen de lo que probaste

- [ ] Probé en ventana de incógnito: ¿funcionó? Sí / No  
- [ ] Revisé extensiones (y si desactivé alguna, cuál)  
- [ ] Revisé permisos de cámara y micrófono  
- [ ] Uso Chrome del trabajo/institución: Sí / No  
- [ ] Probé en otro equipo o Chrome personal: Sí / No (y resultado)

### B) Datos de tu Chrome y equipo

- **Versión de Chrome:** (ej. 120.0.6099.129)  
- **Sistema operativo:** (ej. Windows 11, Mac con macOS 14)  
- **Lista de extensiones** (o captura de `chrome://extensions/`)

### C) Mensaje de error (si sigue saliendo)

Si al intentar "Iniciar Sesión" vuelve a salir el error:

1. Pulsa **F12** (o clic derecho en la página → "Inspeccionar").
2. Ve a la pestaña **"Console"** o **"Consola"**.
3. Cuando salga el error, haz **clic derecho** sobre el mensaje de error → **"Copy"** / **"Copiar"** (o haz una captura de pantalla de la consola).
4. Pega el texto o envía la captura.

Con eso podremos ver el error exacto y seguir investigando.

---

## Resumen rápido

| Paso | Qué hacer | Qué anotar o enviar |
|------|-----------|----------------------|
| 1 | Probar en ventana de incógnito | ¿Funcionó? Sí/No |
| 2 | Revisar/desactivar extensiones | Lista de extensiones; la que al desactivar arregla el problema |
| 3 | Cámara y micrófono en "Permitir" | Si los cambiaste y si después funcionó |
| 4 | Ver versión de Chrome | Número de versión y sistema (Windows/Mac) |
| 5 | Si es Chrome del trabajo | Si probó en Chrome personal y si ahí funciona |
| — | Si no se resuelve | Todo lo anterior + copia o captura del error en la consola (F12 → Console) |

Mientras tanto, puedes seguir usando la videollamada desde **Safari** o desde el **celular** sin problema.
