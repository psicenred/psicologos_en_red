# Videollamadas con Daily.co

El proyecto usa **Daily.co** para las sesiones de video entre paciente y psicólogo (reemplazo de Jitsi/8x8).

## Configuración

1. **Crear cuenta en Daily**  
   https://dashboard.daily.co/

2. **Obtener API Key**  
   En el dashboard: **Developers** → **API Keys** → crear una clave o usar la existente.

3. **Variable de entorno**  
   En tu `.env` (y en Railway como variable de entorno):

   ```env
   DAILY_API_KEY=tu_api_key_aqui
   ```

4. **Reiniciar el servidor**  
   Sin `DAILY_API_KEY`, el endpoint `/api/daily-meeting` responderá 503 y las videollamadas no se crearán.

## Flujo

- **Paciente** (perfil): al hacer clic en “Iniciar videollamada” de una cita se llama a `POST /api/daily-meeting` con `citaId` y `rol: 'paciente'`. El backend crea o reutiliza la sala `sesion-{citaId}` y devuelve una URL y un token. El frontend carga el SDK de Daily y une al usuario a la sala.
- **Psicólogo** (panel-doctor): igual con `rol: 'psicologo'`; el token se emite con `is_owner: true`.
- Cuando ambos entran, se sigue llamando a `POST /api/citas/:id/registrar-entrada` para marcar la cita como “realizada” cuando corresponda.

## Precios y límites

- Daily requiere **tarjeta de crédito añadida** en la cuenta para poder crear salas (incluso en plan gratuito).
- Hay plan gratuito con límite de minutos/mes; consulta: https://www.daily.co/pricing

## Railway y 502

Railway **no bloquea** las llamadas salientes por HTTPS (a diferencia del SMTP, que sí puede estar restringido). Si al pulsar "Iniciar videollamada" recibes una **página HTML** en lugar del video, suele ser un **502 Bad Gateway**: la petición no llega a tu app o la app no respondió a tiempo.

- Revisa en Railway → tu servicio → **Logs**: al hacer clic en el botón, ¿aparece alguna línea (por ejemplo "Daily meeting error")? Si no aparece nada, la petición no está llegando al contenedor.
- Comprueba que **DAILY_API_KEY** esté definida en las variables del **servicio web** (no solo en la base de datos).
- El endpoint `/api/daily-meeting` está preparado para **siempre** responder con JSON (nunca 5xx con HTML); si aun así ves HTML, es la respuesta de error del proxy de Railway antes de llegar a tu app.

## Jitsi/8x8 (legacy)

Las variables `JAAS_APP_ID`, `JAAS_KID` y `JAAS_PRIVATE_KEY` ya no se usan para el flujo de video. Se mantienen en el código por si se necesita un fallback; el frontend usa solo Daily cuando está configurado.
