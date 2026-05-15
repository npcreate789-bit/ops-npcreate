#!/usr/bin/env node
/**
 * Print migrations from a given file prefix (inclusive) to stdout.
 * Usage: node scripts/print-migrations-range.mjs 00033
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const from = process.argv[2]
if (!from || !/^\d{5}/.test(from)) {
  console.error('Usage: node scripts/print-migrations-range.mjs 00033')
  process.exit(1)
}

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql') && f >= `${from}_`)
  .sort()

if (files.length === 0) {
  console.error(`No migrations found from ${from}`)
  process.exit(1)
}

console.log(`-- รันใน Supabase Dashboard → SQL Editor (${files.length} ไฟล์ ตั้งแต่ ${files[0]})\n`)
for (const file of files) {
  console.log(`-- ========== ${file} ==========\n`)
  console.log(readFileSync(resolve(dir, file), 'utf8'))
  console.log('\n')
}
