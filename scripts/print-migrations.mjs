#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

console.log('-- รันใน Supabase Dashboard → SQL Editor (ตามลำดับ)\n')
for (const file of files) {
  console.log(`-- ========== ${file} ==========\n`)
  console.log(readFileSync(resolve(dir, file), 'utf8'))
  console.log('\n')
}
