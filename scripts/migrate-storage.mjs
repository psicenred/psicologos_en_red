#!/usr/bin/env node
/**
 * Migra archivos locales a Supabase Storage y actualiza refs en DB.
 * Requiere: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   node scripts/migrate-storage.mjs [--dry-run]
 *
 * Tablas/columnas:
 *   documentos_psicologo.ruta_archivo
 *   mensajes.ruta_adjunto
 *   blog_articulos.portada_url, imagen_url (URLs /uploads/blog/...)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const BUCKETS = {
  blog: 'blog-images',
  docs: 'psychologist-docs',
  chat: 'chat-attachments',
};

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Falta ${name}`);
  return v;
}

function encodeRef(bucket, key) {
  return `sb://${bucket}/${key}`;
}

function localPathForStored(storedPath) {
  if (storedPath.startsWith('sb://')) return null;
  if (storedPath.startsWith('uploads/blog/')) {
    return path.join(root, 'public', storedPath);
  }
  if (storedPath.startsWith('/uploads/blog/')) {
    return path.join(root, 'public', storedPath.slice(1));
  }
  return path.join(root, 'uploads', storedPath);
}

function blogKeyFromUrl(url) {
  const m = url.match(/\/uploads\/blog\/([^/?#]+)/);
  return m ? m[1] : null;
}

async function uploadFile(supabase, bucket, key, filePath, contentType) {
  const data = fs.readFileSync(filePath);
  if (dryRun) {
    console.log(`[dry-run] upload ${bucket}/${key} ← ${filePath}`);
    return encodeRef(bucket, key);
  }
  const { error } = await supabase.storage.from(bucket).upload(key, data, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return encodeRef(bucket, key);
}

function guessContentType(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function migrateDocumentos(pool, supabase) {
  const { rows } = await pool.query(
    `SELECT id, ruta_archivo FROM documentos_psicologo
     WHERE ruta_archivo IS NOT NULL AND ruta_archivo NOT LIKE 'sb://%'`,
  );
  let n = 0;
  for (const row of rows) {
    const local = localPathForStored(row.ruta_archivo);
    if (!local || !fs.existsSync(local)) {
      console.warn(`  skip doc ${row.id}: no file ${row.ruta_archivo}`);
      continue;
    }
    const key = row.ruta_archivo.replace(/^documentos\//, '');
    const ref = await uploadFile(
      supabase,
      BUCKETS.docs,
      key,
      local,
      guessContentType(local),
    );
    if (!dryRun) {
      await pool.query(
        'UPDATE documentos_psicologo SET ruta_archivo = $1 WHERE id = $2',
        [ref, row.id],
      );
    }
    n++;
  }
  console.log(`Documentos migrados: ${n}`);
}

async function migrateChat(pool, supabase) {
  const { rows } = await pool.query(
    `SELECT id, ruta_adjunto FROM mensajes
     WHERE ruta_adjunto IS NOT NULL AND ruta_adjunto NOT LIKE 'sb://%'`,
  );
  let n = 0;
  for (const row of rows) {
    const local = localPathForStored(row.ruta_adjunto);
    if (!local || !fs.existsSync(local)) {
      console.warn(`  skip msg ${row.id}: no file ${row.ruta_adjunto}`);
      continue;
    }
    const key = row.ruta_adjunto.replace(/^chat\//, '');
    const ref = await uploadFile(
      supabase,
      BUCKETS.chat,
      key,
      local,
      'application/pdf',
    );
    if (!dryRun) {
      await pool.query('UPDATE mensajes SET ruta_adjunto = $1 WHERE id = $2', [
        ref,
        row.id,
      ]);
    }
    n++;
  }
  console.log(`Adjuntos chat migrados: ${n}`);
}

async function migrateBlogUrls(pool, supabase) {
  const { rows } = await pool.query(
    `SELECT id, portada_url, imagen_url FROM blog_articulos`,
  );
  let n = 0;
  for (const row of rows) {
    for (const col of ['portada_url', 'imagen_url']) {
      const url = row[col];
      if (!url || typeof url !== 'string') continue;
      if (url.startsWith('http') || url.startsWith('sb://')) continue;
      const fileName = blogKeyFromUrl(url);
      if (!fileName) continue;
      const local = path.join(root, 'public', 'uploads', 'blog', fileName);
      if (!fs.existsSync(local)) {
        console.warn(`  skip blog ${row.id} ${col}: ${local}`);
        continue;
      }
      await uploadFile(
        supabase,
        BUCKETS.blog,
        fileName,
        local,
        guessContentType(local),
      );
      const publicUrl = `${requireEnv('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/public/${BUCKETS.blog}/${fileName}`;
      if (!dryRun) {
        await pool.query(
          `UPDATE blog_articulos SET ${col} = $1 WHERE id = $2`,
          [publicUrl, row.id],
        );
      }
      n++;
    }
  }
  console.log(`URLs blog actualizadas: ${n}`);
}

async function main() {
  requireEnv('DATABASE_URL');
  requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  console.log(dryRun ? 'Modo dry-run' : 'Migración archivos → Supabase Storage');
  await migrateDocumentos(pool, supabase);
  await migrateChat(pool, supabase);
  await migrateBlogUrls(pool, supabase);
  await pool.end();
  console.log('Listo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
