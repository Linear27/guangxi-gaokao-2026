import { mkdir, writeFile } from 'node:fs/promises'

const tracks = {
  physics: {
    label: '物理类',
    rankSourceBase: 'https://www.gxeea.cn/2025gxywyd/2025_yifenyidang_wuli_qn_',
    admissionSources: [
      ['高职高专普通批', 'https://www.gxeea.cn/view/content_624_32076.htm'],
      ['高职高专提前批其他类', 'https://www.gxeea.cn/view/content_624_31958.htm'],
      ['高职高专提前批艺术类', 'https://www.gxeea.cn/view/content_624_31949.htm'],
      ['高职高专提前批体育类', 'https://www.gxeea.cn/view/content_624_31942.htm'],
      ['本科普通批', 'https://www.gxeea.cn/view/content_624_31849.htm'],
      ['本科提前批其他二类', 'https://www.gxeea.cn/view/content_624_31718.htm'],
      ['本科提前批艺术类本科第二批', 'https://www.gxeea.cn/view/content_624_31716.htm'],
      ['本科提前批其他一类', 'https://www.gxeea.cn/view/content_624_31659.htm'],
    ],
  },
  history: {
    label: '历史类',
    rankSourceBase: 'https://www.gxeea.cn/2025gxywyd/2025_yifenyidang_lishi_qn_',
    admissionSources: [
      ['高职高专普通批', 'https://www.gxeea.cn/view/content_624_32075.htm'],
      ['高职高专提前批其他类', 'https://www.gxeea.cn/view/content_624_31957.htm'],
      ['高职高专提前批艺术类', 'https://www.gxeea.cn/view/content_624_31946.htm'],
      ['高职高专提前批体育类', 'https://www.gxeea.cn/view/content_624_31941.htm'],
      ['本科普通批', 'https://www.gxeea.cn/view/content_624_31848.htm'],
      ['本科提前批其他二类', 'https://www.gxeea.cn/view/content_624_31717.htm'],
      ['本科提前批艺术类本科第二批', 'https://www.gxeea.cn/view/content_624_31732.htm'],
      ['本科提前批其他一类', 'https://www.gxeea.cn/view/content_624_31660.htm'],
      ['本科提前批体育类', 'https://www.gxeea.cn/view/content_624_31651.htm'],
    ],
  },
}

const textDecoder = new TextDecoder('gb18030')

async function main() {
  for (const [track, config] of Object.entries(tracks)) {
    await buildTrackHistory(track, config)
  }
}

async function buildTrackHistory(track, config) {
  const outputDir = new URL(`../public/data/tracks/${track}/history/2025/`, import.meta.url)
  const admissionRows = []
  const rankByScore = new Map()

  for (const [batchName, url] of config.admissionSources) {
    const html = await fetchGxText(url, textDecoder)
    const sourceTitle = extractTitle(html)
    const rows = extractAdmissionRows(html)
    for (const row of rows) {
      admissionRows.push({
        track,
        year: 2025,
        batchName,
        schoolCode: row.schoolCode,
        schoolName: row.schoolName,
        majorGroupCode: row.majorGroupCode,
        minScore: row.minScore,
        rank: null,
        remarks: row.remarks,
        sourceTitle,
        sourceUrl: url,
      })
    }
  }

  const scores = Array.from(new Set(admissionRows.map((row) => row.minScore))).sort((a, b) => b - a)
  const rankEntries = await mapConcurrent(scores, 16, (score) => fetchRankEntry(score, config.rankSourceBase))
  for (const rankEntry of rankEntries) {
    if (rankEntry) {
      rankByScore.set(rankEntry.score, rankEntry)
    }
  }

  const admissionLines = admissionRows.map((row) => ({
    ...row,
    rank: rankByScore.get(row.minScore)?.rank ?? null,
  }))

  const manifest = buildManifest(track, config.label, admissionLines, rankByScore)

  await mkdir(outputDir, { recursive: true })
  await writeJson(new URL(`guangxi-${track}-admission-lines.json`, outputDir), {
    admissionLines,
  })
  await writeJson(new URL(`guangxi-${track}-rank-by-score.json`, outputDir), {
    ranks: Array.from(rankByScore.values()).sort((a, b) => b.score - a.score),
  })
  await writeJson(new URL('manifest.json', outputDir), manifest)
}

async function fetchGxText(url, decoder) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  })
  if (!response.ok) {
    throw new Error(`${url} ${response.status}`)
  }
  return decoder.decode(await response.arrayBuffer())
}

async function fetchRankEntry(score, rankSourceBase) {
  const url = `${rankSourceBase}${score}.html`
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
  })
  if (!response.ok) {
    return null
  }
  const html = await response.text()
  const rows = extractTableRows(html)
    .map((cells) => cells.map(cleanCell))
    .filter((cells) => cells.length >= 2 && /^\d+$/.test(cells[0]) && Number(cells[1]) === score)

  if (rows.length === 0) return null
  const ranks = rows.map((cells) => Number(cells[0])).filter(Number.isFinite)
  return {
    score,
    rank: Math.max(...ranks),
    count: ranks.length,
    sourceUrl: url,
  }
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/is)
  return match ? cleanCell(match[1]) : ''
}

function extractAdmissionRows(html) {
  return extractTableRows(html)
    .map((cells) => cells.map(cleanCell))
    .filter((cells) => cells.length === 5 && /^\d{5}$/.test(cells[0]) && /^\d+$/.test(cells[3]))
    .map(([schoolCode, schoolName, majorGroupCode, minScore, remarks]) => ({
      schoolCode,
      schoolName,
      majorGroupCode,
      minScore: Number(minScore),
      remarks,
    }))
}

function extractTableRows(html) {
  const rows = []
  const trMatches = html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)
  for (const trMatch of trMatches) {
    const cells = []
    const cellMatches = trMatch[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis)
    for (const cellMatch of cellMatches) {
      cells.push(cellMatch[1])
    }
    if (cells.length > 0) rows.push(cells)
  }
  return rows
}

function cleanCell(value) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildManifest(track, label, admissionLines, rankByScore) {
  const byBatch = {}
  for (const row of admissionLines) {
    byBatch[row.batchName] = (byBatch[row.batchName] ?? 0) + 1
  }
  return {
    title: `广西 2025 ${label}院校专业组投档最低分参考`,
    track,
    year: 2025,
    generatedAt: new Date().toISOString(),
    counts: {
      admissionLines: admissionLines.length,
      scoreRanks: rankByScore.size,
      batches: Object.keys(byBatch).length,
    },
    batches: byBatch,
    files: {
      admissionLines: `/data/tracks/${track}/history/2025/guangxi-${track}-admission-lines.json`,
      rankByScore: `/data/tracks/${track}/history/2025/guangxi-${track}-rank-by-score.json`,
    },
  }
}

async function writeJson(url, value) {
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
