import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let moduleApi

beforeEach(async () => {
  vi.resetModules()
  moduleApi = await import('./build-track-data.mjs')
})

describe('track history data loading', () => {
  it('prefers existing track-scoped 2025 reference lines over legacy root data', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gaokao-track-data-'))
    const publicDataDir = new URL(`file:///${root.replaceAll('\\', '/')}/public/data/`)
    const tracksDir = new URL('tracks/', publicDataDir)
    const trackHistoryDir = new URL('history/history/2025/', tracksDir)
    const legacyHistoryDir = new URL('history/2025/', publicDataDir)

    await writeJson(new URL('guangxi-history-admission-lines.json', trackHistoryDir), {
      admissionLines: [{ track: 'history', schoolCode: '10003' }],
    })
    await writeJson(new URL('guangxi-history-admission-lines.json', legacyHistoryDir), {
      admissionLines: [],
    })

    const data = await moduleApi.readTrackHistory('history', { publicDataDir, tracksDir })

    expect(data.admissionLines).toHaveLength(1)
    expect(data.admissionLines[0].schoolCode).toBe('10003')
  })

  it('does not erase rank and manifest files when writing admission lines', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gaokao-track-history-'))
    const tracksDir = new URL(`file:///${root.replaceAll('\\', '/')}/tracks/`)
    const historyDir = new URL('history/history/2025/', tracksDir)
    await writeJson(new URL('guangxi-history-rank-by-score.json', historyDir), { ranks: [{ score: 600 }] })
    await writeJson(new URL('manifest.json', historyDir), { title: '历史类参考线' })

    await moduleApi.writeTrackHistory('history', { admissionLines: [{ track: 'history', schoolCode: '10003' }] }, { tracksDir })

    expect(JSON.parse(await readFile(new URL('guangxi-history-admission-lines.json', historyDir), 'utf8')).admissionLines)
      .toHaveLength(1)
    expect(existsSync(new URL('guangxi-history-rank-by-score.json', historyDir))).toBe(true)
    expect(JSON.parse(await readFile(new URL('manifest.json', historyDir), 'utf8')).title).toBe('历史类参考线')
  })

  it('removes legacy root data while keeping root schema for public readers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gaokao-track-root-'))
    const publicDataDir = new URL(`file:///${root.replaceAll('\\', '/')}/public/data/`)
    const tracksDir = new URL('tracks/', publicDataDir)
    const physicsDir = new URL('physics/', tracksDir)
    const historyDir = new URL('history/', tracksDir)

    await writeTrackFixture(physicsDir, 'physics')
    await writeTrackFixture(historyDir, 'history')
    await writeJson(new URL('programs.json', publicDataDir), { programs: [{ legacy: true }] })
    await writeJson(new URL('site.json', publicDataDir), { programs: [{ legacy: true }] })
    await writeJson(new URL('schema.json', publicDataDir), { title: '旧说明' })
    await writeJson(new URL('schools/10001.json', publicDataDir), { legacy: true })

    await moduleApi.main({ publicDataDir, tracksDir })

    expect(existsSync(new URL('programs.json', publicDataDir))).toBe(false)
    expect(existsSync(new URL('site.json', publicDataDir))).toBe(false)
    expect(existsSync(new URL('schools/', publicDataDir))).toBe(false)
    expect(existsSync(new URL('schema.json', publicDataDir))).toBe(true)
    expect(JSON.parse(await readFile(new URL('schema.json', publicDataDir), 'utf8')).tracks).toEqual([
      'physics',
      'history',
    ])
  })
})

async function writeJson(url, value) {
  await mkdir(new URL('.', url), { recursive: true })
  await writeFile(url, `${JSON.stringify(value)}\n`, 'utf8')
}

async function writeTrackFixture(dir, track) {
  await writeJson(new URL('summary.json', dir), {
    track,
    meta: {},
    counts: { schools: 1, batches: 1, programs: 1 },
    highlightedSchools: [],
    batches: [{ track, batchName: '本科普通批', programCount: 1, slug: 'batch-demo' }],
    filterOptions: { majorGroups: ['101'], firstSubjects: [], secondSubjects: [] },
  })
  await writeJson(new URL('programs.json', dir), {
    programs: [
      {
        track,
        batchName: '本科普通批',
        schoolCode: '10001',
        schoolName: '测试大学',
        majorGroupCode: '101',
        majorCode: '001',
        majorName: '测试专业',
        pdfPage: 1,
      },
    ],
  })
  await writeJson(new URL('schools.json', dir), {
    schools: [{ track, schoolCode: '10001', schoolName: '测试大学', programCount: 1 }],
  })
  await writeJson(new URL('schema.json', dir), { title: `${track} schema` })
}
