# Cómo verificar tu dominio en Resend (DKIM y SPF)

Resend te pide agregar **registros DNS** para poder enviar correos desde `@psicologosenred.com`. Esos registros **no se configuran dentro de Zoho Mail**: se agregan en el lugar donde **administras el DNS** del dominio (los mismos servidores donde ya configuraste los MX para que Zoho reciba el correo).

---

## 1. ¿Dónde está el DNS de psicologosenred.com?

El DNS del dominio está en **quien te dio los nameservers** o donde **gestionas los registros del dominio** (A, CNAME, MX, TXT).

**Si el dominio o el correo eran originalmente de HostGator**, el DNS casi seguro está en **HostGator** (cPanel Zone Editor o el panel de dominios del Customer Portal). Ahí es donde debes añadir los registros DKIM y SPF que te pide Resend.

Otros casos: Zoho (si gestionas el dominio ahí), GoDaddy, Namecheap, Cloudflare, etc.

---

## 2. En Resend: obtener los valores exactos

1. Entra en [resend.com](https://resend.com) → **Domains** → **Add Domain** (o el dominio que ya añadiste).
2. Escribe tu dominio: `psicologosenred.com`.
3. Resend te mostrará **varios registros** que debes crear. Anótalos; suelen ser algo así:
   - **SPF**: un registro **TXT** (a veces en el subdominio `send`, por ejemplo `send.psicologosenred.com`).
   - **DKIM**: un registro **TXT** con un nombre tipo `resend._domainkey` (o similar) y un valor largo.
   - **MX** (opcional): para devolución de correos; si lo pide, créalo como indica Resend.

Copia **nombre/host** y **valor** de cada registro tal como los muestra Resend (no inventes valores).

---

## 3. Añadir los registros en tu proveedor DNS

Entra en el **panel de DNS** de tu dominio (el mismo que usaste para Zoho) y crea **cada** registro que Resend te mostró.

### Ejemplo genérico (cambia según tu proveedor)

En la sección de **registros DNS** o **DNS Management**:

| Tipo | Nombre / Host | Valor / Contenido |
|------|----------------|-------------------|
| TXT  | *(el que diga Resend para SPF, ej. `send`)* | *(valor exacto que da Resend)* |
| TXT  | *(el que diga Resend para DKIM, ej. `resend._domainkey`)* | *(valor largo que da Resend)* |

- **Nombre/Host**: a veces piden solo el subdominio (ej. `send`) y otras el nombre completo (ej. `send.psicologosenred.com`). Usa **exactamente** lo que ponga Resend.
- **Valor**: pega el texto completo que te da Resend, sin quitar ni añadir nada.
- **TTL**: si te dejan elegir, 300 o 3600 está bien.

Guarda los cambios. La propagación puede tardar **unos minutos hasta 24–48 horas** (a veces solo 5–10 minutos).

---

## 4. Si tu DNS está en HostGator

1. Entra en **HostGator** e inicia sesión (customer portal o cPanel, según tu plan).
2. **Opción A – cPanel:**  
   **Dominios** → **Zone Editor** → elige `psicologosenred.com` → **Manage**.
3. **Opción B – Customer Portal:**  
   **Domains** → tu dominio → **Manage** / **DNS** (o similar).
4. Pulsa **+ Add Record** / **Añadir registro**.
5. Tipo: **TXT**.
6. **Name / Host:** el nombre que te dio Resend. En Zone Editor de cPanel a veces piden solo el subdominio (ej. `send` o `resend._domainkey`); en otros paneles el nombre completo (ej. `send.psicologosenred.com`). Usa lo que muestre Resend; si solo ves un cuadro “Name”, prueba primero solo la parte antes del dominio (ej. `send`).
7. **Value / TXT Value / Record:** pega el **valor exacto** que copiaste de Resend (todo el texto, sin quitar ni añadir nada).
8. **TTL:** 300 o 3600 si te lo pide (o déjalo por defecto).
9. Guarda y repite para **cada** registro (SPF y DKIM; MX si Resend lo pide).

**Nota:** Si en HostGator usas nameservers externos (ej. Cloudflare), los registros se añaden en ese otro panel, no en HostGator.

---

## 5. Si tu DNS está en Zoho

1. Entra en [Zoho](https://www.zoho.com) e inicia sesión.
2. Si tienes **Zoho Domains** o **gestión de dominios**:  
   **Mi cuenta** → **Dominios** → elige `psicologosenred.com` → **Administrar DNS** / **Manage DNS**.
3. En la lista de registros, busca **Añadir registro** / **Add record**.
4. Elige tipo **TXT**.
5. **Host**: el nombre que te dio Resend (ej. `send` para SPF, o `resend._domainkey` para DKIM). En algunos paneles piden `send.psicologosenred.com`; en otros solo `send`. Sigue lo que diga Resend.
6. **Valor / TXT Value**: pega el valor exacto que copiaste de Resend.
7. Guarda y repite para **cada** registro (SPF, DKIM y MX si lo pide Resend).

---

## 6. Verificar en Resend

1. Vuelve a [Resend → Domains](https://resend.com/domains).
2. Abre tu dominio y pulsa **Verify DNS Records** / **Verificar**.
3. Si algo falla, Resend suele indicar qué registro falta o está mal. Comprueba:
   - Que el **nombre** del registro coincida (con o sin el dominio, según lo que pida tu proveedor).
   - Que el **valor** esté pegado completo, sin espacios de más al inicio o al final.

---

## 7. No borres los registros de Zoho Mail

Los registros que ya tienes para **Zoho Mail** (por ejemplo el SPF con `include:zohomail.com`) deben **seguir ahí**. Resend suele usar un **subdominio** (como `send`) para su SPF, así que no sustituyas el TXT actual del dominio raíz; solo **añade** los nuevos registros que te pide Resend.

---

## 8. Después de verificar: habilitar correos desde la API

Cuando el dominio aparezca como **Verified** en Resend, configura las variables de entorno para que tu app envíe correos por Resend (en lugar de SMTP).

### Obtener la API Key de Resend

1. Entra en [resend.com](https://resend.com) → **API Keys** (o **Integrations** → **API Keys**).
2. Clic en **Create API Key**.
3. Ponle un nombre (ej. "Psicólogos en Red Railway") y copia la clave. **Solo se muestra una vez**; guárdala en un lugar seguro.

### Configurar en Railway

1. Entra en [Railway](https://railway.app) → tu proyecto → el **servicio** de tu app (Node).
2. Pestaña **Variables** (o **Settings** → **Variables**).
3. Añade estas variables:

| Variable           | Valor                                      |
|--------------------|--------------------------------------------|
| `RESEND_API_KEY`   | *(la API Key que copiaste de Resend)*     |
| `RESEND_FROM`      | `contacto@psicologosenred.com`            |

4. Guarda y haz **Redeploy** del servicio para que cargue las nuevas variables.

Con eso, todos los correos (citas agendadas, recordatorios, cancelaciones, notificaciones de chat, etc.) se enviarán por la API de Resend usando tu dominio verificado.

### Probar en local

En tu `.env` local añade las mismas variables:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=contacto@psicologosenred.com
```

Reinicia el servidor y dispara un flujo que envíe correo (ej. agendar cita) para comprobar que llega.

---

Si algo no cuadra (por ejemplo tu proveedor se llama distinto o te pide “Host” en otro formato), dime en qué paso estás y qué opciones te muestra el panel (nombres de campos y un ejemplo de lo que ves) y lo adaptamos.
