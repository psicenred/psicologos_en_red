const PROFILE_LINK_DOMAIN = 'psicologosenred.com';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function allowStrongOnly(escaped: string): string {
  return escaped
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>');
}

function boldify(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function linkify(text: string): string {
  const re = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(re);
  let out = '';
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';

  for (const part of parts) {
    if (/^https?:\/\/[^\s<]+$/.test(part)) {
      const href = part.replace(/[.,;:!?]+$/, '');
      let isInternal = false;
      let pathOnly = href;
      try {
        const u = new URL(href);
        isInternal =
          u.origin === currentOrigin ||
          Boolean(u.hostname?.includes(PROFILE_LINK_DOMAIN));
        if (isInternal) pathOnly = u.pathname + (u.search || '') + (u.hash || '');
      } catch {
        /* URL relativa o inválida */
      }
      const isProfile =
        href.includes(PROFILE_LINK_DOMAIN) &&
        href.includes('catalogo') &&
        href.includes('ver=');
      const label = isProfile
        ? 'Ver perfil'
        : isInternal
          ? pathOnly
          : escapeHtml(href);
      const cls = isProfile
        ? 'chat-widget-msg-link chat-widget-profile-btn'
        : 'chat-widget-msg-link';
      if (isInternal) {
        out += `<a href="${escapeHtml(pathOnly)}" class="${cls}">${escapeHtml(label)}</a>`;
      } else {
        out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="${cls}">${label}</a>`;
      }
    } else {
      out += escapeHtml(part);
    }
  }
  return out;
}

/** Formatea respuestas de Redi (listas, enlaces, negritas) como en chat-widget.js legacy */
export function formatBotMessage(text: string): string {
  if (!text) return '';
  const lines = text.split(/\n/);
  const out: string[] = [];
  let inList = false;
  let listTag: 'ul' | 'ol' | null = null;
  const ulOl = /^\s*[-*]\s+/;
  const olRe = /^\s*\d+\.\s+/;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (ulOl.test(raw)) {
      if (!inList || listTag !== 'ul') {
        if (inList) out.push(listTag === 'ul' ? '</ul>' : '</ol>');
        out.push('<ul class="chat-widget-list">');
        listTag = 'ul';
        inList = true;
      }
      out.push(
        `<li>${linkify(boldify(allowStrongOnly(escapeHtml(trimmed.replace(ulOl, '')))))}</li>`,
      );
    } else if (olRe.test(raw)) {
      if (!inList || listTag !== 'ol') {
        if (inList) out.push(listTag === 'ul' ? '</ul>' : '</ol>');
        out.push('<ol class="chat-widget-list">');
        listTag = 'ol';
        inList = true;
      }
      out.push(
        `<li>${linkify(boldify(allowStrongOnly(escapeHtml(trimmed.replace(olRe, '')))))}</li>`,
      );
    } else {
      if (inList) {
        out.push(listTag === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      if (trimmed) {
        out.push(
          `<p class="chat-widget-p">${linkify(boldify(allowStrongOnly(escapeHtml(trimmed))))}</p>`,
        );
      }
    }
  }
  if (inList) out.push(listTag === 'ul' ? '</ul>' : '</ol>');
  return out.join('');
}
