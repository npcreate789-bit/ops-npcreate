export type HomeNoticeNavState = {
  homeNotice?: string
}

export function readHomeNoticeFromState(state: unknown): string | null {
  const notice = (state as HomeNoticeNavState | null)?.homeNotice
  return typeof notice === 'string' && notice.trim() ? notice.trim() : null
}
