import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

const publicProgramKeys = [
  'track',
  'batchName',
  'schoolCode',
  'schoolName',
  'schoolTotalPlan',
  'schoolLocation',
  'consultPhone',
  'majorGroupCode',
  'majorGroupPlan',
  'firstSubject',
  'secondSubject',
  'majorCode',
  'majorName',
  'planCount',
  'durationYears',
  'tuitionPerYear',
  'campus',
  'remarks',
  'pdfPage',
  'bookPage',
]

const trackLabels = {
  physics: '物理类',
  history: '历史类',
}

const publicTerms = ['rawText', 'ocrSource', 'reviewFlags', 'reviews', 'sourcePdf', 'processedPages']

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      output: { type: 'string' },
      track: { type: 'string' },
      'book-page-offset': { type: 'string' },
    },
  })

  const input = required(values.input, '--input')
  const output = required(values.output, '--output')
  const track = required(values.track, '--track')
  if (!['physics', 'history'].includes(track)) {
    throw new Error('--track must be physics or history')
  }

  const bookPageOffset = Number(required(values['book-page-offset'], '--book-page-offset'))
  if (!Number.isInteger(bookPageOffset)) {
    throw new Error('--book-page-offset must be an integer')
  }

  const source = JSON.parse(await readFile(input, 'utf8'))
  const publicData = toPublicTrackData(source, track, bookPageOffset)
  await writeTrackArtifacts(output, publicData)
}

function toPublicTrackData(source, track, bookPageOffset) {
  const programs = (source.programs ?? []).map((program) => {
    const publicProgram = {}
    for (const key of publicProgramKeys) {
      publicProgram[key] = key === 'track' ? track : program[key] ?? null
    }
    publicProgram.bookPage = Number.isInteger(publicProgram.pdfPage) ? publicProgram.pdfPage - bookPageOffset : null
    return publicProgram
  })

  const schools = (source.schools ?? []).map((school) => ({ ...school, track }))
  const batches = buildBatches(programs, track)
  return {
    meta: {
      title: `2026年广西高考指南招生计划篇（${trackLabels[track]}）`,
    },
    frontMatter: [],
    militaryPlan: [],
    indexEntries: [],
    schools,
    batches,
    programs,
  }
}

function buildBatches(programs, track) {
  const byName = new Map()
  for (const program of programs) {
    const batchName = program.batchName || '未知批次'
    byName.set(batchName, {
      track,
      batchName,
      programCount: (byName.get(batchName)?.programCount ?? 0) + 1,
    })
  }
  return Array.from(byName.values())
}

async function writeTrackArtifacts(output, data) {
  const root = pathToFileURL(ensureTrailingSlash(output))
  await mkdir(root, { recursive: true })
  await writeJson(new URL('site.json', root), data)
  await writeJson(new URL('summary.json', root), buildSummary(data))
  await writeJson(new URL('programs.json', root), { programs: data.programs })
  await writeJson(new URL('schools.json', root), { schools: data.schools })
  await writeJson(new URL('schema.json', root), buildSchema(data))
  await writeSlices(root, data)
}

async function writeSlices(root, data) {
  const schoolsDir = new URL('schools/', root)
  const batchesDir = new URL('batches/', root)
  await rm(schoolsDir, { recursive: true, force: true })
  await rm(batchesDir, { recursive: true, force: true })
  await mkdir(schoolsDir, { recursive: true })
  await mkdir(batchesDir, { recursive: true })

  const schoolPayloads = new Map()
  for (const school of data.schools) {
    schoolPayloads.set(school.schoolCode, { school, programs: [] })
  }
  for (const program of data.programs) {
    if (!schoolPayloads.has(program.schoolCode)) {
      schoolPayloads.set(program.schoolCode, {
        school: schoolFromProgram(program),
        programs: [],
      })
    }
    schoolPayloads.get(program.schoolCode).programs.push(program)
  }
  for (const [schoolCode, payload] of schoolPayloads) {
    await writeJson(new URL(`${schoolCode}.json`, schoolsDir), payload)
  }

  const batchPayloads = new Map()
  for (const batch of data.batches) {
    batchPayloads.set(slugBatch(batch.batchName), { batch, programs: [] })
  }
  for (const program of data.programs) {
    const slug = slugBatch(program.batchName || '未知批次')
    if (!batchPayloads.has(slug)) {
      batchPayloads.set(slug, {
        batch: { track: program.track, batchName: program.batchName || '未知批次', programCount: 0 },
        programs: [],
      })
    }
    batchPayloads.get(slug).programs.push(program)
  }
  for (const [slug, payload] of batchPayloads) {
    payload.batch.programCount = payload.programs.length
    await writeJson(new URL(`${slug}.json`, batchesDir), payload)
  }
}

function buildSummary(data) {
  return {
    track: data.programs[0]?.track ?? data.schools[0]?.track ?? 'history',
    meta: data.meta,
    counts: {
      schools: data.schools.length,
      batches: data.batches.length,
      programs: data.programs.length,
    },
    highlightedSchools: data.schools.slice(0, 8),
    batches: data.batches.map((batch) => ({ ...batch, slug: slugBatch(batch.batchName) })),
    filterOptions: {
      majorGroups: sortedValues(data.programs.map((program) => program.majorGroupCode)),
      firstSubjects: sortedValues(data.programs.map((program) => program.firstSubject)),
      secondSubjects: sortedValues(data.programs.map((program) => program.secondSubject)),
    },
  }
}

function buildSchema(data) {
  return {
    title: data.meta.title,
    topLevelKeys: ['meta', 'frontMatter', 'militaryPlan', 'indexEntries', 'schools', 'batches', 'programs'],
    programFields: publicProgramKeys,
  }
}

function schoolFromProgram(program) {
  return {
    track: program.track,
    schoolCode: program.schoolCode,
    schoolName: program.schoolName,
    schoolTotalPlan: program.schoolTotalPlan,
    schoolLocation: program.schoolLocation,
    consultPhone: program.consultPhone,
    programCount: 0,
  }
}

function sortedValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    String(left).localeCompare(String(right), 'zh-CN', { numeric: true }),
  )
}

function slugBatch(batchName) {
  let hashValue = 0
  for (const char of batchName) {
    hashValue = (hashValue * 31 + char.charCodeAt(0)) >>> 0
  }
  return `batch-${base36(hashValue)}`
}

function base36(value) {
  if (value === 0) return '0'
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
  const digits = []
  let current = value
  while (current) {
    digits.push(alphabet[current % 36])
    current = Math.floor(current / 36)
  }
  return digits.reverse().join('')
}

async function writeJson(url, value) {
  const text = JSON.stringify(value, null, 2)
  const leaked = publicTerms.filter((term) => text.includes(term))
  if (leaked.length > 0) {
    throw new Error(`public JSON contains blocked fields: ${leaked.join(', ')}`)
  }
  await mkdir(new URL('.', url), { recursive: true })
  await writeFile(url, `${text}\n`, 'utf8')
}

function ensureTrailingSlash(path) {
  return path.endsWith('/') || path.endsWith('\\') ? path : `${path}/`
}

function required(value, name) {
  if (!value) throw new Error(`${name} is required`)
  return value
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
