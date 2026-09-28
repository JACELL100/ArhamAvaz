import * as XLSX from 'xlsx'
import { LANGUAGES } from './settings'
import { isValidPhone, toE164 } from './format'

const NAME_HEADER = /^(customer\s*)?name$|^(full|lead|contact)\s*name$/i
const PHONE_HEADER = /^(phone|mobile|contact|whatsapp)(\s*(no|number))?$|^number$/i
const LANGUAGE_HEADER = /^lang(uage)?$/i
const PHONE_IN_TEXT = /(\+?\d[\d\s-]{8,14}\d)/

function matchLanguage(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (!v) return undefined
  const found = LANGUAGES.find((l) => l.id === v || l.name.toLowerCase() === v)
  return found?.id
}

// Guesses which column holds name/phone/language from a header row; falls back
// to "first phone-like column is phone, first other column is name" when there's no header.
function mapColumns(header) {
  const map = {}
  header.forEach((cell, i) => {
    const h = String(cell || '').trim()
    if (PHONE_HEADER.test(h)) map.phone ??= i
    else if (NAME_HEADER.test(h)) map.name ??= i
    else if (LANGUAGE_HEADER.test(h)) map.language ??= i
  })
  return map
}

function looksLikeHeader(row) {
  return row.some((c) => PHONE_HEADER.test(String(c || '').trim()) || NAME_HEADER.test(String(c || '').trim()))
}

function rowsToContacts(rows) {
  if (rows.length === 0) return []
  const header = rows[0]
  const hasHeader = looksLikeHeader(header)
  const map = hasHeader ? mapColumns(header) : {}
  const body = hasHeader ? rows.slice(1) : rows

  if (map.phone === undefined) {
    // No recognizable header: guess by shape. A single column is phone-only;
    // two or more columns are assumed "name, phone, ...".
    const sample = body.find((r) => r.some((c) => String(c || '').trim())) || []
    if (sample.length <= 1) {
      map.phone = 0
    } else {
      const firstIsPhone = PHONE_IN_TEXT.test(String(sample[0] || ''))
      map.phone = firstIsPhone ? 0 : 1
      map.name = firstIsPhone ? undefined : 0
    }
  }

  const seen = new Set()
  const contacts = []
  for (const row of body) {
    const rawPhone = row[map.phone]
    if (!String(rawPhone || '').trim()) continue
    const phone = toE164(rawPhone)
    if (seen.has(phone)) continue
    seen.add(phone)
    contacts.push({
      name: map.name !== undefined ? String(row[map.name] || '').trim() : '',
      phone,
      rawPhone: String(rawPhone).trim(),
      language: map.language !== undefined ? matchLanguage(row[map.language]) : undefined,
      valid: isValidPhone(phone),
    })
  }
  return contacts
}

// Freeform text (no columns): pull a phone number out of each line and treat the rest as the name.
function linesToContacts(text) {
  const seen = new Set()
  const contacts = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const m = trimmed.match(PHONE_IN_TEXT)
    if (!m) continue
    const rawPhone = m[1]
    const phone = toE164(rawPhone)
    if (seen.has(phone)) continue
    seen.add(phone)
    contacts.push({
      name: trimmed.replace(rawPhone, '').replace(/^[\s,;:|-]+|[\s,;:|-]+$/g, '').trim(),
      phone,
      rawPhone,
      language: undefined,
      valid: isValidPhone(phone),
    })
  }
  return contacts
}

function ext(name) {
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase()
}

export async function parseContactsFile(file) {
  const type = ext(file.name)
  if (type === 'pdf') {
    throw new Error('PDF upload isn’t supported yet — export the list to Excel (.xlsx) or CSV/text first.')
  }
  if (['xlsx', 'xls', 'csv'].includes(type)) {
    const buf = await file.arrayBuffer()
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
    return rowsToContacts(rows)
  }
  if (type === 'txt') {
    const text = await file.text()
    // A .txt that's actually comma/tab separated still parses fine as rows.
    const rows = text
      .split(/\r?\n/)
      .map((l) => l.split(/\t|,(?![^()]*\))/).map((c) => c.trim()))
      .filter((r) => r.some((c) => c))
    const hasColumns = rows.some((r) => r.length > 1)
    return hasColumns ? rowsToContacts(rows) : linesToContacts(text)
  }
  throw new Error(`Unsupported file type ".${type}". Use Excel (.xlsx/.xls), CSV or a plain text file.`)
}
