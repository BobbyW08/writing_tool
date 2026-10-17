// Every kind of link between two entries. "inverse" is how the link reads from the other side,
// so a link stored once (C10 parent of C12) also shows on C12 as "Child of C10" with no double entry.

export const RELATIONSHIP_TYPES = [
  // Family
  { value: 'parent_of', label: 'Parent of', inverse: 'Child of', group: 'Family' },
  { value: 'sibling_of', label: 'Sibling of', inverse: 'Sibling of', group: 'Family' },
  { value: 'spouse_of', label: 'Spouse of', inverse: 'Spouse of', group: 'Family' },
  { value: 'relative_of', label: 'Other relative of', inverse: 'Other relative of', group: 'Family' },
  // People
  { value: 'love_interest_of', label: 'Love interest of', inverse: 'Love interest of', group: 'People' },
  { value: 'friend_of', label: 'Friend of', inverse: 'Friend of', group: 'People' },
  { value: 'ally_of', label: 'Ally of', inverse: 'Ally of', group: 'People' },
  { value: 'rival_of', label: 'Rival of', inverse: 'Rival of', group: 'People' },
  { value: 'enemy_of', label: 'Enemy of', inverse: 'Enemy of', group: 'People' },
  { value: 'mentor_of', label: 'Mentor of', inverse: 'Mentee of', group: 'People' },
  { value: 'serves', label: 'Serves', inverse: 'Served by', group: 'People' },
  { value: 'killed', label: 'Killed', inverse: 'Killed by', group: 'People' },
  // Places
  { value: 'born_in', label: 'Born in', inverse: 'Birthplace of', group: 'Places' },
  { value: 'lives_in', label: 'Lives in', inverse: 'Home of', group: 'Places' },
  { value: 'located_in', label: 'Located in', inverse: 'Contains', group: 'Places' },
  { value: 'rules', label: 'Rules', inverse: 'Ruled by', group: 'Places' },
  { value: 'visited', label: 'Visited', inverse: 'Visited by', group: 'Places' },
  // Groups
  { value: 'member_of', label: 'Member of', inverse: 'Has member', group: 'Groups' },
  { value: 'leader_of', label: 'Leader of', inverse: 'Led by', group: 'Groups' },
  { value: 'belongs_to_culture', label: 'Belongs to culture', inverse: 'Includes', group: 'Groups' },
  { value: 'belongs_to_race', label: 'Belongs to race', inverse: 'Includes', group: 'Groups' },
  { value: 'speaks', label: 'Speaks', inverse: 'Spoken by', group: 'Groups' },
  // Items
  { value: 'owns', label: 'Owns', inverse: 'Owned by', group: 'Items' },
  { value: 'wields', label: 'Wields', inverse: 'Wielded by', group: 'Items' },
  { value: 'created', label: 'Created', inverse: 'Created by', group: 'Items' },
  // Events and stories
  { value: 'participated_in', label: 'Participated in', inverse: 'Had participant', group: 'Events and stories' },
  { value: 'took_place_at', label: 'Took place at', inverse: 'Site of', group: 'Events and stories' },
  { value: 'caused', label: 'Caused', inverse: 'Caused by', group: 'Events and stories' },
  { value: 'appears_in', label: 'Appears in', inverse: 'Features', group: 'Events and stories' },
  { value: 'mentioned_in', label: 'Mentioned in', inverse: 'Mentions', group: 'Events and stories' },
  // Catch-all
  { value: 'related_to', label: 'Related to', inverse: 'Related to', group: 'Other' },
] as const

export type RelationshipTypeValue = (typeof RELATIONSHIP_TYPES)[number]['value']
