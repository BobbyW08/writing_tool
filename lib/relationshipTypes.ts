// Every kind of link between two entries. "inverse" is how the link reads from the other side,
// so a link stored once (C10 parent of C12) also shows on C12 as "Child of C10" with no double entry.
//
// "hierarchy" tells a tree view which side is the root-ward side, if either: 'from_is_parent' means
// the `from` record sits above `to`, 'from_is_child' means the reverse, 'none' means the pair has no
// tree orientation (most types). A family tree uses parent_of/spouse_of/sibling_of; a causality tree
// uses caused/follows; a content tree uses whatever types are chosen plus the `parent` field link.

export const RELATIONSHIP_TYPES = [
  // Family
  { value: 'parent_of', label: 'Parent of', inverse: 'Child of', group: 'Family', hierarchy: 'from_is_parent' },
  { value: 'sibling_of', label: 'Sibling of', inverse: 'Sibling of', group: 'Family', hierarchy: 'none' },
  { value: 'spouse_of', label: 'Spouse of', inverse: 'Spouse of', group: 'Family', hierarchy: 'none' },
  { value: 'relative_of', label: 'Other relative of', inverse: 'Other relative of', group: 'Family', hierarchy: 'none' },
  // People
  { value: 'love_interest_of', label: 'Love interest of', inverse: 'Love interest of', group: 'People', hierarchy: 'none' },
  { value: 'friend_of', label: 'Friend of', inverse: 'Friend of', group: 'People', hierarchy: 'none' },
  { value: 'ally_of', label: 'Ally of', inverse: 'Ally of', group: 'People', hierarchy: 'none' },
  { value: 'rival_of', label: 'Rival of', inverse: 'Rival of', group: 'People', hierarchy: 'none' },
  { value: 'enemy_of', label: 'Enemy of', inverse: 'Enemy of', group: 'People', hierarchy: 'none' },
  { value: 'mentor_of', label: 'Mentor of', inverse: 'Mentee of', group: 'People', hierarchy: 'none' },
  { value: 'serves', label: 'Serves', inverse: 'Served by', group: 'People', hierarchy: 'none' },
  { value: 'killed', label: 'Killed', inverse: 'Killed by', group: 'People', hierarchy: 'none' },
  // Places
  { value: 'born_in', label: 'Born in', inverse: 'Birthplace of', group: 'Places', hierarchy: 'none' },
  { value: 'lives_in', label: 'Lives in', inverse: 'Home of', group: 'Places', hierarchy: 'none' },
  { value: 'located_in', label: 'Located in', inverse: 'Contains', group: 'Places', hierarchy: 'from_is_child' },
  { value: 'rules', label: 'Rules', inverse: 'Ruled by', group: 'Places', hierarchy: 'none' },
  { value: 'visited', label: 'Visited', inverse: 'Visited by', group: 'Places', hierarchy: 'none' },
  // Groups
  { value: 'member_of', label: 'Member of', inverse: 'Has member', group: 'Groups', hierarchy: 'from_is_child' },
  { value: 'leader_of', label: 'Leader of', inverse: 'Led by', group: 'Groups', hierarchy: 'none' },
  { value: 'belongs_to_culture', label: 'Belongs to culture', inverse: 'Includes', group: 'Groups', hierarchy: 'from_is_child' },
  { value: 'belongs_to_race', label: 'Belongs to race', inverse: 'Includes', group: 'Groups', hierarchy: 'from_is_child' },
  { value: 'speaks', label: 'Speaks', inverse: 'Spoken by', group: 'Groups', hierarchy: 'none' },
  // Items
  { value: 'owns', label: 'Owns', inverse: 'Owned by', group: 'Items', hierarchy: 'none' },
  { value: 'wields', label: 'Wields', inverse: 'Wielded by', group: 'Items', hierarchy: 'none' },
  { value: 'created', label: 'Created', inverse: 'Created by', group: 'Items', hierarchy: 'none' },
  // Events and stories
  { value: 'participated_in', label: 'Participated in', inverse: 'Had participant', group: 'Events and stories', hierarchy: 'none' },
  { value: 'took_place_at', label: 'Took place at', inverse: 'Site of', group: 'Events and stories', hierarchy: 'none' },
  { value: 'caused', label: 'Caused', inverse: 'Caused by', group: 'Events and stories', hierarchy: 'from_is_parent' },
  { value: 'follows', label: 'Follows', inverse: 'Followed by', group: 'Events and stories', hierarchy: 'from_is_child' },
  { value: 'appears_in', label: 'Appears in', inverse: 'Features', group: 'Events and stories', hierarchy: 'none' },
  { value: 'mentioned_in', label: 'Mentioned in', inverse: 'Mentions', group: 'Events and stories', hierarchy: 'none' },
  // Catch-all
  { value: 'related_to', label: 'Related to', inverse: 'Related to', group: 'Other', hierarchy: 'none' },
] as const

export type RelationshipTypeValue = (typeof RELATIONSHIP_TYPES)[number]['value']
export type RelationshipHierarchy = (typeof RELATIONSHIP_TYPES)[number]['hierarchy']
