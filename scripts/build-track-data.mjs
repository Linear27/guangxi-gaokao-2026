import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const publicDataDir = new URL('../public/data/', import.meta.url)
const tracksDir = new URL('../public/data/tracks/', import.meta.url)

const trackLabels = {
  physics: '物理类',
  history: '历史类',
}

async function main(options = {}) {
  const context = resolveContext(options)
  const physics = await readPhysicsTrackData(context)
  await writeTrackData('physics', physics, context)

  const history = await readHistoryTrackData(context)
  await writeTrackData('history', history, context)
  await removeLegacyPublicData(context)
  await writeRootManifest({ physics, history }, context)
  await writeRootSchema(context)
  await writeLlmsTxt({ physics, history }, context)
}

async function readPhysicsTrackData(options = {}) {
  const context = resolveContext(options)
  const { publicDataDir, tracksDir } = context
  const sourceDir = new URL('./physics/', tracksDir)
  if (existsSync(sourceDir)) {
    return readTrackDataFromDir('physics', sourceDir, context)
  }

  return {
    summary: await readJson(new URL('summary.json', publicDataDir)),
    programs: await readJson(new URL('programs.json', publicDataDir)),
    schools: await readJson(new URL('schools.json', publicDataDir)),
    site: existsSync(new URL('site.json', publicDataDir)) ? await readJson(new URL('site.json', publicDataDir)) : null,
    schema: existsSync(new URL('schema.json', publicDataDir)) ? await readJson(new URL('schema.json', publicDataDir)) : null,
    history2025: await readTrackHistory('physics', context),
  }
}

async function readHistoryTrackData(options = {}) {
  const context = resolveContext(options)
  const { tracksDir } = context
  const sourceDir = new URL('./history/', tracksDir)
  if (!existsSync(sourceDir)) {
    return emptyTrackData('history')
  }

  return readTrackDataFromDir('history', sourceDir, context)
}

async function readTrackDataFromDir(track, sourceDir, context) {
  return {
    summary: existsSync(new URL('summary.json', sourceDir))
      ? await readJson(new URL('summary.json', sourceDir))
      : emptySummary(track),
    programs: existsSync(new URL('programs.json', sourceDir))
      ? await readJson(new URL('programs.json', sourceDir))
      : { programs: [] },
    schools: existsSync(new URL('schools.json', sourceDir))
      ? await readJson(new URL('schools.json', sourceDir))
      : { schools: [] },
    site: null,
    schema: existsSync(new URL('schema.json', sourceDir)) ? await readJson(new URL('schema.json', sourceDir)) : null,
    history2025: await readTrackHistory(track, context),
  }
}

function emptyTrackData(track) {
  return {
    summary: emptySummary(track),
    programs: { programs: [] },
    schools: { schools: [] },
    site: null,
    schema: null,
    history2025: { admissionLines: [] },
  }
}

function emptySummary(track) {
  return {
    track,
    meta: { title: `2026年广西高考指南招生计划篇（${trackLabels[track]}）` },
    counts: { schools: 0, batches: 0, programs: 0 },
    highlightedSchools: [],
    batches: [],
    filterOptions: { majorGroups: [], firstSubjects: [trackLabels[track].replace('类', '')], secondSubjects: [] },
  }
}

async function readTrackHistory(track, options = {}) {
  const { publicDataDir, tracksDir } = resolveContext(options)
  const trackFile = new URL(`${track}/history/2025/guangxi-${track}-admission-lines.json`, tracksDir)
  if (existsSync(trackFile)) return await readJson(trackFile)
  const legacyFile = new URL(`history/2025/guangxi-${track}-admission-lines.json`, publicDataDir)
  if (existsSync(legacyFile)) return await readJson(legacyFile)
  return { admissionLines: [] }
}

async function writeTrackData(track, data, options = {}) {
  const { tracksDir } = resolveContext(options)
  const target = new URL(`${track}/`, tracksDir)
  await mkdir(target, { recursive: true })

  await writeJson(new URL('summary.json', target), withTrackSummary(data.summary, track))
  await writeJson(new URL('programs.json', target), {
    programs: withTrackPrograms(data.programs.programs ?? [], track),
  })
  await writeJson(new URL('schools.json', target), {
    schools: withTrackSchools(data.schools.schools ?? [], track),
  })

  await rm(new URL('site.json', target), { recursive: true, force: true })
  if (data.schema) {
    await writeJson(new URL('schema.json', target), data.schema)
  }

  await writeTrackSlices(track, data, options)
  await writeTrackHistory(track, data.history2025, options)
}

async function writeTrackSlices(track, data, options = {}) {
  const { tracksDir } = resolveContext(options)
  const target = new URL(`${track}/`, tracksDir)
  const schoolsDir = new URL('schools/', target)
  const batchesDir = new URL('batches/', target)
  await resetDir(schoolsDir)
  await resetDir(batchesDir)

  const schoolPayloads = buildSchoolPayloads(
    withTrackSchools(data.schools.schools ?? [], track),
    withTrackPrograms(data.programs.programs ?? [], track),
  )
  for (const [schoolCode, payload] of schoolPayloads) {
    await writeJson(new URL(`${schoolCode}.json`, schoolsDir), payload)
  }

  const batchPayloads = buildBatchPayloads(
    (data.summary.batches ?? []).map((batch) => ({ ...batch, track })),
    withTrackPrograms(data.programs.programs ?? [], track),
  )
  for (const [batchSlug, payload] of batchPayloads) {
    await writeJson(new URL(`${batchSlug}.json`, batchesDir), payload)
  }
}

async function writeTrackHistory(track, history2025, options = {}) {
  const { tracksDir } = resolveContext(options)
  const historyDir = new URL(`${track}/history/2025/`, tracksDir)
  await mkdir(historyDir, { recursive: true })
  await writeJson(new URL(`guangxi-${track}-admission-lines.json`, historyDir), {
    admissionLines: withTrackAdmissionLines(history2025.admissionLines ?? [], track),
  })
}

async function writeRootManifest(dataByTrack, options = {}) {
  const { publicDataDir } = resolveContext(options)
  const tracks = Object.entries(dataByTrack).map(([track, data]) => {
    const summary = withTrackSummary(data.summary, track)
    return {
      track,
      label: trackLabels[track],
      counts: summary.counts,
      files: {
        summary: `/data/tracks/${track}/summary.json`,
        programs: `/data/tracks/${track}/programs.json`,
        schools: `/data/tracks/${track}/schools.json`,
      },
      routes: {
        search: `/${track}/search`,
        school: `/${track}/schools/{schoolCode}`,
        batch: `/${track}/batches/{batchSlug}`,
      },
    }
  })
  await writeJson(new URL('manifest.json', publicDataDir), {
    title: '广西 2026 招生计划查询',
    tracks,
  })
}

async function writeRootSchema(options = {}) {
  const { publicDataDir } = resolveContext(options)
  await writeJson(new URL('schema.json', publicDataDir), {
    title: '广西 2026 招生计划查询公开数据说明',
    files: {
      manifest: '/data/manifest.json',
      trackSummary: '/data/tracks/{track}/summary.json',
      trackPrograms: '/data/tracks/{track}/programs.json',
      trackSchools: '/data/tracks/{track}/schools.json',
      schoolDetail: '/data/tracks/{track}/schools/{schoolCode}.json',
      batchDetail: '/data/tracks/{track}/batches/{batchSlug}.json',
      admissionLines2025: '/data/tracks/{track}/history/2025/guangxi-{track}-admission-lines.json',
    },
    tracks: ['physics', 'history'],
    programFields: [
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
    ],
    admissionLineFields: [
      'track',
      'year',
      'batchName',
      'schoolCode',
      'schoolName',
      'majorGroupCode',
      'minScore',
      'rank',
      'remarks',
      'sourceTitle',
      'sourceUrl',
    ],
  })
}

async function writeLlmsTxt(dataByTrack, options = {}) {
  const { publicDataDir } = resolveContext(options)
  const lines = [
    '# 广西 2026 招生计划查询',
    '',
    '这是面向考生的广西招生计划静态查询站。',
    '',
    '## Data',
    '',
    '- 数据摘要: /data/manifest.json',
    '- 物理类摘要: /data/tracks/physics/summary.json',
    '- 物理类计划: /data/tracks/physics/programs.json',
    '- 历史类摘要: /data/tracks/history/summary.json',
    '- 历史类计划: /data/tracks/history/programs.json',
    '',
    '## Routes',
    '',
    '- 首页: /',
    '- 物理类检索: /physics/search',
    '- 历史类检索: /history/search',
    '- 院校页: /{track}/schools/{schoolCode}',
    '- 批次页: /{track}/batches/{batchSlug}',
    '',
    '## Counts',
    '',
  ]
  for (const [track, data] of Object.entries(dataByTrack)) {
    const summary = withTrackSummary(data.summary, track)
    lines.push(`- ${trackLabels[track]}: ${summary.counts.schools} 所院校，${summary.counts.programs} 条专业计划`)
  }
  await writeFile(new URL('../llms.txt', publicDataDir), `${lines.join('\n')}\n`, 'utf8')
}

async function removeLegacyPublicData(options = {}) {
  const { publicDataDir } = resolveContext(options)
  const legacyEntries = [
    'site.json',
    'summary.json',
    'programs.json',
    'schools.json',
    'schools/',
    'batches/',
    'history/',
  ]
  for (const entry of legacyEntries) {
    await rm(new URL(entry, publicDataDir), { recursive: true, force: true })
  }
}

function withTrackSummary(summary, track) {
  return {
    ...summary,
    track,
    meta: {
      ...(summary.meta ?? {}),
      title: `2026年广西高考指南招生计划篇（${trackLabels[track]}）`,
    },
    highlightedSchools: withTrackSchools(summary.highlightedSchools ?? [], track),
    batches: (summary.batches ?? []).map((batch) => ({ ...batch, track })),
  }
}

function withTrackPrograms(programs, track) {
  return programs.map((program) => ({ ...program, track }))
}

function withTrackSchools(schools, track) {
  return schools.map((school) => ({ ...school, track }))
}

function withTrackAdmissionLines(lines, track) {
  return lines.map((line) => ({ ...line, track }))
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

function buildSchoolPayloads(schools, programs) {
  const payloads = new Map(schools.map((school) => [school.schoolCode, { school, programs: [] }]))
  for (const program of programs) {
    if (!payloads.has(program.schoolCode)) {
      payloads.set(program.schoolCode, {
        school: {
          track: program.track,
          schoolCode: program.schoolCode,
          schoolName: program.schoolName,
          schoolTotalPlan: program.schoolTotalPlan,
          schoolLocation: program.schoolLocation,
          consultPhone: program.consultPhone,
          programCount: 0,
        },
        programs: [],
      })
    }
    payloads.get(program.schoolCode).programs.push(program)
  }
  return payloads
}

function buildBatchPayloads(batches, programs) {
  const payloads = new Map(batches.map((batch) => [batch.slug, { batch, programs: [] }]))
  for (const program of programs) {
    const slug = slugBatch(program.batchName || '未知批次')
    if (!payloads.has(slug)) {
      payloads.set(slug, {
        batch: {
          track: program.track,
          batchName: program.batchName || '未知批次',
          programCount: 0,
          slug,
        },
        programs: [],
      })
    }
    payloads.get(slug).programs.push(program)
  }
  return payloads
}

async function resetDir(dir) {
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
}

async function readJson(url) {
  return JSON.parse(await readFile(url, 'utf8'))
}

async function writeJson(url, value) {
  await mkdir(new URL('.', url), { recursive: true })
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function resolveContext(options = {}) {
  return {
    publicDataDir: options.publicDataDir ?? publicDataDir,
    tracksDir: options.tracksDir ?? tracksDir,
  }
}

const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (isCli) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export { main, readTrackHistory, writeTrackHistory }
