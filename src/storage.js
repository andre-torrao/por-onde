export const SUGGEST_STORE = 'pt_tracker_suggestions_v1'

const readStore  = key => { try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} } }
const writeStore = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)) } catch(e) {} }

export function getSuggestions(locationId) {
  const all = readStore(SUGGEST_STORE)
  return Promise.resolve((all[locationId] || []).filter(s => s.status === 'approved'))
}

export function saveSuggestions(locationKey, list) {
  const all = readStore(SUGGEST_STORE)
  all[locationKey] = list
  writeStore(SUGGEST_STORE, all)
}

export function getAllPendingSuggestions() {
  const all = readStore(SUGGEST_STORE)
  const pending = []
  Object.entries(all).forEach(([key, suggs]) => {
    suggs.forEach(s => {
      if (s.status === 'pending') pending.push({
        ...s, location: key,
        displayLocation: s.locationName || key,
      })
    })
  })
  return Promise.resolve(pending.sort((a, b) => (b.createdAt||0) - (a.createdAt||0)))
}

export function getSuggestionsForUser(userId) {
  const all = readStore(SUGGEST_STORE)
  const result = []
  Object.entries(all).forEach(([key, suggs]) => {
    suggs.forEach(s => {
      if (s.author === userId) result.push({
        ...s, location: key,
        displayLocation: s.locationName || key,
      })
    })
  })
  return Promise.resolve(result.sort((a, b) => (b.createdAt||0) - (a.createdAt||0)))
}

export async function setSuggestionStatus(id, status) {
  const all = readStore(SUGGEST_STORE)
  Object.keys(all).forEach(loc => {
    all[loc] = all[loc].map(s => s.id === id ? { ...s, status } : s)
  })
  writeStore(SUGGEST_STORE, all)
}

export async function deleteSuggestion(id) {
  const all = readStore(SUGGEST_STORE)
  Object.keys(all).forEach(loc => {
    all[loc] = all[loc].filter(s => s.id !== id)
  })
  writeStore(SUGGEST_STORE, all)
}

export async function addSuggestion({ locationId, locationName, category, text, date, photo, authorId, authorUsername }) {
  const all = readStore(SUGGEST_STORE)
  if (!all[locationId]) all[locationId] = []
  all[locationId].unshift({
    id: Date.now().toString(),
    category, text,
    date_info: date, date,
    photo_url: null, photo: photo || null,
    author: authorUsername || authorId,
    author_id: authorId,
    locationName,
    createdAt: Date.now(),
    status: 'pending',
  })
  writeStore(SUGGEST_STORE, all)
  return true
}

export function compressImage(file, maxW = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getGallery()  { return [] }
export function saveGallery() {}
