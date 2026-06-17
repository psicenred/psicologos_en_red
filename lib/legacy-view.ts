import fs from 'fs';
import path from 'path';

const VIEWS_DIR = path.join(process.cwd(), 'views');

export type LegacyViewName =
  | 'index'
  | 'catalogo'
  | 'nosotros'
  | 'contacto'
  | 'blog'
  | 'academia'
  | 'terminos-condiciones'
  | 'aviso-privacidad'
  | 'trabaja-con-nosotros'
  | 'login'
  | 'registro'
  | 'registro-exitoso'
  | 'reestablecer-password'
  | 'perfil'
  | 'panel-admin'
  | 'panel-doctor';

const GLOBAL_STYLES = ['estilos.css', 'chat-widget.css'];
const GLOBAL_SCRIPTS = ['i18n.js', 'chat-widget.js', 'pwa-register.js'];

function stripGlobalScripts(html: string): string {
  let result = html;
  for (const script of GLOBAL_SCRIPTS) {
    result = result.replace(
      new RegExp(
        `<script[^>]+src=["'][^"']*${script.replace('.', '\\.')}["'][^>]*>\\s*</script>`,
        'gi',
      ),
      '',
    );
  }
  return result;
}

function readViewFile(viewName: LegacyViewName): string {
  const filePath = path.join(VIEWS_DIR, `${viewName}.html`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Vista legacy no encontrada: ${viewName}.html`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/** En Next el HTML legacy va dentro de un div; conservamos class/style del <body>. */
function wrapWithBodyAttributes(
  bodyOpenTag: string,
  bodyInner: string,
): string {
  const classMatch = bodyOpenTag.match(/\bclass=["']([^"']*)["']/i);
  const styleMatch = bodyOpenTag.match(/\bstyle=["']([^"']*)["']/i);
  const className = classMatch?.[1]?.trim();
  const style = styleMatch?.[1]?.trim();

  if (!className && !style) {
    return bodyInner;
  }

  const attrs: string[] = [];
  if (className) attrs.push(`class="${className}"`);
  if (style) attrs.push(`style="${style}"`);

  return `<div ${attrs.join(' ')}>${bodyInner}</div>`;
}

/** Extrae título, estilos/scripts del head y contenido del body de una vista HTML legacy. */
export function loadLegacyView(viewName: LegacyViewName): {
  title: string;
  bodyHtml: string;
} {
  const content = readViewFile(viewName);

  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim() ?? 'Psicólogos en Red';

  const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch?.[1] ?? '';

  const styleTags = [...headContent.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)]
    .map((m) => m[0])
    .join('\n');

  const extraHeadLinks = [
    ...headContent.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi),
  ]
    .map((m) => m[0])
    .filter((link) => !GLOBAL_STYLES.some((css) => link.includes(css)))
    .join('\n');

  const externalScripts = [
    ...headContent.matchAll(/<script[^>]+src=[^>]+><\/script>/gi),
  ]
    .map((m) => m[0])
    .join('\n');

  const bodyOpenMatch = content.match(/<body([^>]*)>/i);
  const bodyOpenTag = bodyOpenMatch?.[1] ?? '';
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyInner = bodyMatch?.[1]?.trim() ?? '';
  const wrappedBody = wrapWithBodyAttributes(bodyOpenTag, bodyInner);

  const bodyHtml = stripGlobalScripts(
    [styleTags, extraHeadLinks, externalScripts, wrappedBody]
      .filter(Boolean)
      .join('\n'),
  );

  return { title, bodyHtml };
}
