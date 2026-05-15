export interface QuickAccessEntry {
  path: string
  title: string
  subtitle?: string
  visitedAt: string
}

export interface QuickAccessState {
  recent: QuickAccessEntry[]
  pinned: string[]
}
