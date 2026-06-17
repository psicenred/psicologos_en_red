# Guía: Llevar Psicólogos en Red a Play Store y App Store

Tu proyecto es una **web app** (Node/Express + HTML/CSS/JS). Para publicarla en las tiendas tienes dos caminos principales.

---

## ✅ PWA mínima ya implementada

En el proyecto ya está hecha una **PWA mínima** que no cambia el comportamiento de la web:

- **`public/manifest.json`**: nombre, colores (rosa/hueso), `start_url`, `display: standalone`, iconos (usa `/images/logo.png` por ahora).
- **`public/sw.js`**: Service Worker que **no cachea nada**; solo reenvía todas las peticiones al servidor. Así la app se puede “instalar” sin romper lógica ni sesiones.
- **`public/pwa-register.js`**: Registra el SW solo en HTTPS o localhost.
- En **index**, **login**, **registro**, **catalogo**, **perfil** y **panel-doctor** se añadieron `<link rel="manifest">`, `theme-color` y el script de registro.
- El servidor sirve `/manifest.json` con tipo `application/manifest+json`.

**Para instalarla en el móvil o en el escritorio:** entra a tu sitio en **HTTPS** (o en `http://localhost` en desarrollo). En Chrome/Edge: menú (⋮) → “Instalar Psicólogos en Red” / “Instalar aplicación”. En Safari (iOS): botón Compartir → “Añadir a la pantalla de inicio”.

**Opcional:** Si quieres iconos dedicados para “Añadir a la pantalla de inicio”, crea `public/images/icon-192.png` y `public/images/icon-512.png` y actualiza las rutas en `manifest.json`.

---

## Opción 1: PWA + empaquetado (recomendada)

Convertir la web en una **PWA** (Progressive Web App) y luego empaquetarla como app nativa para Android e iOS.

### Pasos generales

1. **Hacer la web una PWA**
   - Añadir `manifest.json` (nombre, iconos, colores, pantalla de inicio).
   - Añadir un **Service Worker** (opcional pero recomendado: caché, funcionar offline básico).
   - En el HTML: `<link rel="manifest" href="/manifest.json">` y meta para theme-color.

2. **Empaquetar para las tiendas**
   - **Capacitor** (Ionic): toma tu carpeta de build (o la web ya desplegada) y genera:
     - Proyecto **Android** (Android Studio) → subes el AAB a Play Store.
     - Proyecto **iOS** (Xcode) → subes a App Store Connect.
   - Alternativa: **PWA Builder** (pwabuilder.com) si tu sitio ya es PWA y está en HTTPS; puede generar paquetes para ambas tiendas.

3. **Requisitos de cada tienda**
   - **Google Play**: cuenta de desarrollador (pago único), política de privacidad, descripción, capturas, icono, etc.
   - **Apple App Store**: cuenta Apple Developer (anual), mismo tipo de materiales + revisión de Apple (más estricta).

---

## Opción 2: Solo PWA (sin tiendas)

- Mejorar la web con manifest + Service Worker.
- Los usuarios la agregan a la pantalla de inicio (“Añadir a la pantalla de inicio” / “Install app”).
- **No** aparece en Play Store ni App Store, pero no pagas cuotas ni pasas revisión.

---

## Qué necesitas tener listo antes

| Requisito | Android (Play) | iOS (App Store) |
|-----------|----------------|-----------------|
| Cuenta desarrollador | Google Play Console (~25 USD una vez) | Apple Developer Program (99 USD/año) |
| Iconos de la app | 512×512 y varios tamaños | 1024×1024 y varios tamaños |
| Política de privacidad | URL pública | URL pública |
| HTTPS en producción | Sí | Sí |
| Mac para compilar iOS | No | **Sí** (Xcode solo en macOS) |

---

## Orden sugerido cuando quieras hacerlo

1. **Fase 1 – PWA**
   - Crear `public/manifest.json`.
   - Crear `public/sw.js` (service worker básico).
   - Enlazar manifest en las vistas principales (perfil, panel-doctor, login, etc.).

2. **Fase 2 – Capacitor (o PWA Builder)**
   - Instalar Capacitor en el proyecto.
   - Configurar la URL de tu web en producción (o apuntar al build estático si lo tienes).
   - Añadir plataformas: `npx cap add android`, `npx cap add ios`.
   - Generar release Android (AAB) e iOS (archivo para App Store).

3. **Fase 3 – Tiendas**
   - Crear las cuentas de desarrollador si aún no las tienes.
   - Crear la ficha de la app en cada tienda (descripción, capturas, categoría, privacidad).
   - Subir el AAB (Play) y el build de Xcode (App Store) y enviar a revisión.

---

## Enlaces útiles

- [Capacitor](https://capacitorjs.com/docs) – Documentación oficial.
- [PWA Builder](https://www.pwabuilder.com/) – Empaquetado de PWA a Android/iOS.
- [Google Play Console](https://play.google.com/console).
- [App Store Connect](https://appstoreconnect.apple.com/).
- [Web App Manifest](https://developer.mozilla.org/es/docs/Web/Manifest) – Estándar del manifest.

---

## Nota sobre el backend

Tu app sigue usando tu servidor Node/Express en la nube. Las “apps” de las tiendas serán básicamente un navegador que abre tu URL (o una copia estática si usas build). Asegúrate de que la URL de producción use **HTTPS** y que CORS y cookies/sesión estén bien configurados para que la app en el móvil funcione igual que en el navegador.

Cuando quieras dar el paso, se puede:
1. Definir y crear el `manifest.json` y el Service Worker.
2. Configurar Capacitor paso a paso en tu proyecto.
3. Preparar una checklist de requisitos para Play Store y App Store.

Dime en qué fase quieres que te guíe primero (PWA, Capacitor o tiendas) y lo hacemos.  
*(Documento creado para uso futuro; no se ha modificado el código del proyecto.)*
