export interface ActivityFilters {
  entity_type: string
  search: string
  actor_id: string
  date_from: string
  date_to: string
  action_prefix: string
}

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  entity_type: '',
  search: '',
  actor_id: '',
  date_from: '',
  date_to: '',
  action_prefix: '',
}
