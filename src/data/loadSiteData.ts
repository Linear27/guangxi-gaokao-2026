import type {
  AdmissionLinesData,
  BatchPayload,
  ProgramsData,
  SchoolIndexData,
  SchoolPayload,
  SummaryData,
  Track,
} from '../types'
import {
  batchPayloadUrl,
  historyAdmissionLinesUrl,
  programsUrl,
  schoolPayloadUrl,
  schoolsUrl,
  summaryUrl,
} from './derive'

export async function loadSummaryData(track: Track): Promise<SummaryData> {
  return loadJson<SummaryData>(summaryUrl(track), `${track} summary.json`)
}

export async function loadProgramsData(track: Track): Promise<ProgramsData> {
  return loadJson<ProgramsData>(programsUrl(track), `${track} programs.json`)
}

export async function loadSchoolIndexData(track: Track): Promise<SchoolIndexData> {
  return loadJson<SchoolIndexData>(schoolsUrl(track), `${track} schools.json`)
}

export async function loadSchoolPayload(track: Track, schoolCode: string): Promise<SchoolPayload> {
  return loadJson<SchoolPayload>(schoolPayloadUrl(track, schoolCode), '院校数据')
}

export async function loadBatchPayload(track: Track, batchSlug: string): Promise<BatchPayload> {
  return loadJson<BatchPayload>(batchPayloadUrl(track, batchSlug), '批次数据')
}

export async function loadAdmissionLines2025(track: Track): Promise<AdmissionLinesData> {
  return loadJson<AdmissionLinesData>(historyAdmissionLinesUrl(track), '2025 参考线')
}

async function loadJson<T>(url: string, label: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${label} 加载失败: ${response.status}`)
  }
  return (await response.json()) as T
}
