# Stripe – Guía paso a paso

Sigue estos pasos en orden. Cuando termines uno, pasa al siguiente.

---

## PASO 1: Clave secreta de Stripe (ya la tienes)

En tu `.env` ya está:
- `STRIPE_SECRET_KEY=sk_test_...`

Si en el futuro quieres cobrar de verdad, en el Dashboard de Stripe cambias a modo **Live** y usas la clave que empieza por `sk_live_`.

---

## PASO 2: Añadir BASE_URL al .env

Para que los enlaces de éxito/cancelación de Stripe apunten a tu sitio:

- **En local:** en `.env` añade (o deja):
  ```env
  BASE_URL=http://localhost:3000
  ```
- **En producción:** cuando subas el sitio, cambia a:
  ```env
  BASE_URL=https://tudominio.com
  ```

---

## PASO 3: Webhook en local (para que al pagar se cree la cita)

Sin el webhook, el pago se hace en Stripe pero la cita **no** se crea en tu app. Hay que hacer dos cosas.

### 3.1 Instalar Stripe CLI

- **Mac (Homebrew):**
  ```bash
  brew install stripe/stripe-cli/stripe
  ```
- **Windows:** descarga desde https://github.com/stripe/stripe-cli/releases  
- **O con npm (cualquier OS):**
  ```bash
  npm install -g stripe
  ```

Luego en la terminal:
```bash
stripe login
```
Se abrirá el navegador para que inicies sesión con tu cuenta de Stripe.

### 3.2 Poner en marcha el “túnel” del webhook

1. Arranca tu servidor Node (por ejemplo `node server.js` o `npm start`) en el puerto 3000.
2. En **otra terminal** ejecuta:
   ```bash
   stripe listen --forward-to localhost:3000/webhook/stripe
   ```
3. La CLI mostrará algo como:
   ```text
   Ready! Your webhook signing secret is whsec_xxxxxxxxxxxx
   ```
4. Copia ese valor `whsec_...` y en tu `.env` añade (o completa):
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```
5. Reinicia el servidor Node para que cargue el nuevo `.env`.

Mientras `stripe listen` esté corriendo, los pagos de prueba que hagas harán que Stripe envíe el evento a tu app y se cree la cita.

---

## PASO 4: Probar el flujo completo en local

1. Servidor Node corriendo.
2. `stripe listen --forward-to localhost:3000/webhook/stripe` en otra terminal.
3. Entra a tu app en `http://localhost:3000`, inicia sesión como paciente, agenda una cita (catálogo o perfil).
4. Te redirigirá a Stripe Checkout. Usa tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Fecha y CVC: cualquiera futura (ej. 12/34, 123).
5. Completa el pago. Deberías volver a tu sitio y la cita debe aparecer en “Mis citas” y en el panel del psicólogo.

Si la cita no aparece, revisa la terminal donde corre `stripe listen`: ahí verás si el webhook llegó y si tu servidor respondió bien.

---

## PASO 5: Producción (cuando subas el sitio)

1. **Dominio con HTTPS** (ej. `https://psicologosenred.com` o tu URL de Railway).

2. **En el Dashboard de Stripe:**  
   Developers → Webhooks → Add endpoint  
   - URL: `https://tudominio.com/webhook/stripe`  
   - Eventos: selecciona **checkout.session.completed**  
   - Crea el endpoint y copia el **Signing secret**.

3. **En el servidor de producción** (variables de entorno o `.env`):
   - `BASE_URL=https://tudominio.com`
   - `STRIPE_WEBHOOK_SECRET=` el **nuevo** secret del endpoint que creaste (no el de `stripe listen`).
   - Si ya vas a cobrar de verdad: `STRIPE_SECRET_KEY=sk_live_...` (clave Live del Dashboard).

4. Reinicia el servidor en producción.

Con esto, el setup de Stripe queda completo en local y en producción.

---

## Dónde y cómo configurar el webhook (detalle)

El **webhook** es un aviso que Stripe envía a tu servidor cuando pasa algo (por ejemplo: “el pago se completó”). Tu app tiene la ruta `/webhook/stripe` que recibe ese aviso y crea la cita. Para que Stripe sepa a qué URL enviarlo, tienes que crear un **endpoint** en el Dashboard.

### 1. Entrar al Dashboard de Stripe

1. Abre **https://dashboard.stripe.com** e inicia sesión.
2. Arriba a la derecha verás un interruptor **“Test mode”** (modo prueba). Déjalo en **ON** si estás probando; en **OFF** cuando cobres de verdad.

### 2. Ir a Webhooks

1. En el menú de la izquierda, haz clic en **“Developers”** (Desarrolladores).
2. En el submenú que se abre, haz clic en **“Webhooks”**.
3. Verás la lista de endpoints. Si no has creado ninguno para producción, estará vacía (o solo el de `stripe listen` en local).

### 3. Crear el endpoint para Railway (o tu dominio)

1. Haz clic en el botón **“Add endpoint”** (o “Añadir endpoint”).
2. **Endpoint URL:**  
   Pega la URL de tu app en Railway **+** `/webhook/stripe`.  
   Ejemplos:
   - `https://tu-app.up.railway.app/webhook/stripe`
   - O si tienes dominio propio: `https://psicologosenred.com/webhook/stripe`  
   (Sustituye por tu URL real; sin barra al final.)
3. **Eventos a escuchar:**  
   - Puedes elegir **“Select events”** (Seleccionar eventos).
   - Marca **“checkout.session.completed”** (es el que usa tu app para crear la cita tras el pago).
   - Si quieres, puedes marcar más eventos después; para que la cita se cree solo necesitas este.
4. Clic en **“Add endpoint”** para guardar.

### 4. Copiar el Signing secret

1. Después de crear el endpoint, Stripe te lleva a la página de **detalle** de ese webhook.
2. En la sección **“Signing secret”** verás algo como:
   - **Reveal** o **Click to reveal** → haz clic para que se muestre el valor.
   - El valor empieza por **`whsec_`** (por ejemplo `whsec_1a2b3c4d5e6f...`).
3. **Cópialo completo** (todo el texto que empieza por `whsec_`).
4. Ese valor es el que debes poner en Railway en la variable **`STRIPE_WEBHOOK_SECRET`**.

Importante: el secret de **“Stripe CLI”** (el que te da `stripe listen` en local) **no** sirve para Railway. En Railway tiene que ir **solo** el Signing secret del endpoint que acabas de crear en el Dashboard (el que tiene la URL de tu app).

### 5. Resumen rápido

| Dónde              | Qué hacer |
|--------------------|-----------|
| **Stripe Dashboard** | Developers → Webhooks → Add endpoint → URL = `https://TU-URL-RAILWAY/webhook/stripe` → evento `checkout.session.completed` → Add endpoint. |
| **Misma página**     | Copiar el **Signing secret** (whsec_...). |
| **Railway**          | Variables → `STRIPE_WEBHOOK_SECRET` = el valor que copiaste → Redeploy. |

Si la URL de tu app en Railway cambia (por ejemplo otro dominio), tienes que crear **otro** endpoint en Stripe con la nueva URL y usar el **nuevo** Signing secret en Railway.
