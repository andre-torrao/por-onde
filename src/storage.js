import { supabase } from './supabase'

export async function getSuggestions(locationId) {
  const { data } = await supabase
    .from('suggestions')
    .select('*')
    .eq('location_id', locationId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  return (data || []).map(normalise)
}

export async function getAllPendingSuggestions() {
  const { data } = await supabase
    .from('suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return (data || []).map(s => ({
    ...normalise(s),
    location: s.location_id,
    displayLocation: s.location_name,
  }))
}

export async function getSuggestionsForUser(username) {
  const { data } = await supabase
    .from('suggestions')
    .select('*')
    .eq('author_username', username)
    .order('created_at', { ascending: false })
  return (data || []).map(s => ({
    ...normalise(s),
    location: s.location_id,
    displayLocation: s.location_name,
  }))
}

export async function setSuggestionStatus(id, status) {
  await supabase.from('suggestions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteSuggestion(id) {
  await supabase.from('suggestions').delete().eq('id', id)
}

export async function addSuggestion({ locationId, locationName, category, text, date, photo, authorId, authorUsername }) {
  const { error } = await supabase.from('suggestions').insert({
    location_id:     locationId,
    location_name:   locationName,
    category,
    text,
    date_info:       date || null,
    photo_url:       photo || null,   // base64 stored directly for now
    author_id:       authorId || null,
    author_username: authorUsername || null,
    status:          'pending',
  })
  return !error
}

export async function saveSuggestions() {
  // no-op: kept for API compatibility (old localStorage version)
}

// Normalise DB row to the shape the UI expects
function normalise(s) {
  return {
    id:           s.id,
    category:     s.category,
    text:         s.text,
    date:         s.date_info || null,
    date_info:    s.date_info || null,
    photo:        s.photo_url || null,
    photo_url:    s.photo_url || null,
    author:       s.author_username || '',
    author_id:    s.author_id || null,
    locationName: s.location_name,
    createdAt:    new Date(s.created_at).getTime(),
    status:       s.status,
  }
}

// Image compression helper — unchanged
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
