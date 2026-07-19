const MEMBER_LEVELS = new Set(['公开', 'V1', 'V2', 'V3', 'V4'])

function normalizeText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function galleryFilters(event = {}) {
  const level = normalizeText(event.level, 8)
  return {
    category: normalizeText(event.category, 20),
    level: MEMBER_LEVELS.has(level) ? level : '',
    keyword: normalizeText(event.keyword, 40).toLocaleLowerCase('zh-CN'),
  }
}

function filterCollections(items, filters) {
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.level && item.level !== filters.level) return false
    if (!filters.keyword) return true
    return [item.title, item.description, item.category]
      .some((value) => normalizeText(value, 120).toLocaleLowerCase('zh-CN').includes(filters.keyword))
  })
}

module.exports = { filterCollections, galleryFilters, normalizeText }
