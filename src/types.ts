export type Maybe<T> = T | null
export type PlanCount = number | string
export type Tuition = number | string
export type Track = 'physics' | 'history'

export type TrackInfo = {
  track: Track
  label: string
  title: string
}

export type Program = {
  track: Track
  batchName: string
  schoolCode: string
  schoolName: string
  schoolTotalPlan: Maybe<number>
  schoolLocation: Maybe<string>
  consultPhone: Maybe<string>
  majorGroupCode: string
  majorGroupPlan: Maybe<number>
  firstSubject: Maybe<string>
  secondSubject: Maybe<string>
  majorCode: string
  majorName: string
  planCount: Maybe<PlanCount>
  durationYears: Maybe<number>
  tuitionPerYear: Maybe<Tuition>
  campus: Maybe<string>
  remarks: Maybe<string>
  pdfPage: number
  bookPage: Maybe<number>
}

export type School = {
  track: Track
  schoolCode: string
  schoolName: string
  schoolTotalPlan: Maybe<number>
  schoolLocation: Maybe<string>
  consultPhone: Maybe<string>
  programCount: number
}

export type Batch = {
  track: Track
  batchName: string
  programCount: number
}

export type SiteData = {
  meta: Record<string, unknown>
  frontMatter: unknown[]
  militaryPlan: unknown[]
  indexEntries: unknown[]
  schools: School[]
  batches: Batch[]
  programs: Program[]
}

export type BatchSummary = Batch & {
  slug: string
}

export type SummaryData = {
  track: Track
  meta: Record<string, unknown>
  counts: {
    schools: number
    batches: number
    programs: number
  }
  highlightedSchools: School[]
  batches: BatchSummary[]
  filterOptions: {
    majorGroups: string[]
    firstSubjects: string[]
    secondSubjects: string[]
  }
}

export type SchoolIndexData = {
  schools: School[]
}

export type ProgramsData = {
  programs: Program[]
}

export type SchoolPayload = {
  school: School
  programs: Program[]
}

export type BatchPayload = {
  batch: Batch
  programs: Program[]
}

export type ProgramRow = Program & {
  id: string
  history2025?: AdmissionLine | null
}

export type AdmissionLine = {
  track: Track
  year: 2025
  batchName: string
  schoolCode: string
  schoolName: string
  majorGroupCode: string
  minScore: number
  rank: Maybe<number>
  remarks: Maybe<string>
  sourceTitle: string
  sourceUrl: string
}

export type AdmissionLinesData = {
  admissionLines: AdmissionLine[]
}
