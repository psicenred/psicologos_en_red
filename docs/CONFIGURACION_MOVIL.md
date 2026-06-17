# Configuración móvil del sitio

Este proyecto **no tiene una versión móvil separada**. Todo es la misma web con **diseño responsive**: el mismo HTML y CSS, y los estilos cambian según el ancho de pantalla.

## Qué hace que “funcione en celular”

1. **Viewport en el HTML**  
   En todas las páginas está:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```
   Eso hace que el navegador use el ancho real del dispositivo (p. ej. 375px en un iPhone) para el layout y para los **media queries**. Sin esta etiqueta, el navegador suele simular una pantalla ancha y los estilos “móviles” no se aplican bien.

2. **Un solo breakpoint “móvil”**  
   En `estilos.css` se usa **768px** como límite de “móvil”:
   - Menú del header → hamburguesa cuando la pantalla ≤ 768px.
   - Sidebar de perfil y panel doctor → botón ☰, scroll, “Minimizar” cuando ≤ 768px.
   - Otras secciones (grids, tablas, etc.) también usan `max-width: 768px` para adaptarse.

   En la raíz del CSS hay una variable de referencia: `--breakpoint-movil: 768px` (por si más adelante quieres cambiar el valor en un solo sitio).

3. **Solo responsive CSS**  
   No hay que “configurar móvil” en otro lado: con viewport + media queries `@media (max-width: 768px) { ... }` el mismo código sirve para escritorio y celular. Cuando abras la página en un celular (o reduzcas la ventana del navegador por debajo de 768px), esos estilos se aplican solos.

## Si en el celular no se ve el diseño móvil

- **Caché:** Prueba recarga forzada o pestaña privada.
- **Deploy:** Confirma que el último deploy en Railway (o tu hosting) incluye los cambios y que las hojas de estilo se están sirviendo actualizadas.
- **Viewport:** Comprueba que la página tenga la meta viewport anterior (en el `<head>`).

No hace falta una “versión móvil” aparte ni configuración extra de servidor para que el responsive funcione; con lo anterior es suficiente.
