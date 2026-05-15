export type SearchResultKind = 'lead' | 'customer' | 'task'

export interface SearchResult {
  id: string
  kind: SearchResultKind
  title: string
  subtitle: string | null
  href: string
}

export interface GlobalSearchResponse {
  query: string
  results: SearchResult[]
}
