import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

async function fetchDataset(level) {
  if (level === 'parishes') { const m = await import('./data/parishes-final.json'); return m.default }
  const m = await import('./data/municipalities-final.json'); return m.default
}

function featureStyle(isVisited, isHovered) {
  return {
    fillColor:   isVisited ? '#e8612e' : '#d8d4ca',
    fillOpacity: isHovered ? 0.85 : isVisited ? 0.75 : 0.50,
    color:       isHovered ? '#c04020' : isVisited ? '#a83010' : '#a8a49a',
    weight:      isHovered ? 2.0 : isVisited ? 1.4 : 0.6,
  }
}

function slugify(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
}

// CRITICAL: makeId must be deterministic and unique
// Uses pre-stamped __idx so no indexOf needed
function makeId(props) {
  if (props.reference) return `ref__${props.reference}`
  return `${slugify(props.name)}__${props.__idx}`
}

function getCenter(layer) {
  try {
    if (layer.getCenter) return layer.getCenter()
    if (layer.getBounds) return layer.getBounds().getCenter()
  } catch(_) {}
  return null
}

const MapView = forwardRef(function MapView({ visited, onToggle, onHover, onReady, level }, ref) {
  const elRef      = useRef(null)
  const mapRef     = useRef(null)
  const geoRef     = useRef(null)
  const layersRef  = useRef({})   // id → Leaflet layer
  const labelsRef  = useRef({})   // id → permanent tooltip
  const idNamesRef = useRef({})   // id → displayName (for labels)
  const hoveredRef = useRef(null)
  const visitedRef = useRef(visited)

  // Keep visitedRef always current
  useEffect(() => { visitedRef.current = visited }, [visited])

  // Update styles AND labels when visited changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.entries(layersRef.current).forEach(([id, layer]) => {
      const isV = visited.has(id)
      const isH = hoveredRef.current === id
      layer.setStyle(featureStyle(isV, isH))

      if (isV && !labelsRef.current[id]) {
        const displayName = idNamesRef.current[id] || ''
        const center = getCenter(layer)
        if (center && displayName) {
          const label = L.tooltip({
            permanent: true, direction: 'center',
            className: 'map-label map-label-visited', offset: [0, 0]
          }).setContent(displayName).setLatLng(center)
          label.addTo(map)
          labelsRef.current[id] = label
          // Apply current zoom visibility
          const el = label.getElement ? label.getElement() : null
          if (el && map.getZoom() < 9) el.style.display = 'none'
        }
      } else if (!isV && labelsRef.current[id]) {
        labelsRef.current[id].remove()
        delete labelsRef.current[id]
      }
    })
  }, [visited])

  useImperativeHandle(ref, () => ({
    zoomToId(id) {
      const layer = layersRef.current[id]
      const map   = mapRef.current
      if (!layer || !map) return
      try {
        const b = layer.getBounds ? layer.getBounds() : null
        if (b && b.isValid()) map.fitBounds(b, { maxZoom: 12, padding: [60, 60], animate: true })
      } catch(_) {}
    }
  }), [])

  function clearAll() {
    Object.values(labelsRef.current).forEach(l => { try { l.remove() } catch(_) {} })
    labelsRef.current = {}
    if (geoRef.current && mapRef.current) {
      try { mapRef.current.removeLayer(geoRef.current) } catch(_) {}
      geoRef.current = null
    }
    layersRef.current = {}
    idNamesRef.current = {}
  }

  async function loadLevel(map, lvl) {
    clearAll()

    const dataset = await fetchDataset(lvl)

    // Build duplicate name set for display names
    const nameCount = {}
    dataset.features.forEach(f => { nameCount[f.properties.name] = (nameCount[f.properties.name]||0)+1 })
    const dupeNames = new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1))

    const idNameMap = new Map()

    const geo = L.geoJSON(dataset, {
      // IMPORTANT: style function uses visitedRef (always current) not the closed-over visited
      style: f => featureStyle(visitedRef.current.has(makeId(f.properties)), false),

      onEachFeature(f, layer) {
        const id          = makeId(f.properties)
        const name        = f.properties.name || ''
        const concelho    = f.properties.concelho || ''
        // Show concelho in name only for truly duplicate names
        const displayName = dupeNames.has(name) && concelho && concelho !== name
          ? `${name}, ${concelho}` : name

        // Register in all lookups
        idNameMap.set(id, { name, concelho, displayName })
        layersRef.current[id]  = layer
        idNamesRef.current[id] = displayName

        // Permanent label if already visited on load
        if (visitedRef.current.has(id)) {
          const center = getCenter(layer)
          if (center) {
            const label = L.tooltip({
              permanent: true, direction: 'center',
              className: 'map-label map-label-visited', offset: [0, 0]
            }).setContent(displayName).setLatLng(center)
            label.addTo(map)
            labelsRef.current[id] = label
            const el = label.getElement ? label.getElement() : null
            if (el && map.getZoom() < 9) el.style.display = 'none'
          }
        }

        // Each layer gets its OWN handlers with its OWN id in closure
        // This prevents any cross-contamination between features
        const layerId = id // capture in closure
        const layerDisplayName = displayName

        layer.on('mouseover', e => {
          // Clear previous hovered layer
          if (hoveredRef.current && hoveredRef.current !== layerId) {
            const prev = layersRef.current[hoveredRef.current]
            if (prev) prev.setStyle(featureStyle(visitedRef.current.has(hoveredRef.current), false))
          }
          hoveredRef.current = layerId
          layer.setStyle(featureStyle(visitedRef.current.has(layerId), true))
          onHover({
            name: layerDisplayName, rawName: name, concelho, id: layerId,
            isVisited: visitedRef.current.has(layerId),
            x: e.originalEvent.clientX, y: e.originalEvent.clientY
          })
        })

        layer.on('mousemove', e => {
          onHover(p => p ? { ...p, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null)
        })

        layer.on('mouseout', () => {
          if (hoveredRef.current === layerId) hoveredRef.current = null
          layer.setStyle(featureStyle(visitedRef.current.has(layerId), false))
          onHover(null)
        })

        // CRITICAL: click uses the unique layerId, not a shared variable
        layer.on('click', () => onToggle(layerId, layerDisplayName))
      },
    }).addTo(map)

    geoRef.current = geo

    try {
      const b = geo.getBounds()
      if (b.isValid()) map.fitBounds(b, { padding: [16, 16] })
    } catch(_) {}

    onReady(idNameMap)
  }

  useEffect(() => {
    if (!mapRef.current) return
    loadLevel(mapRef.current, level)
  }, [level]) // eslint-disable-line

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(elRef.current, {
      center: [39.5, -8.0], zoom: 7,
      zoomControl: false, attributionControl: false,
      maxZoom: 18, minZoom: 5,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map)
    mapRef.current = map
    loadLevel(map, level)

    // Show/hide permanent labels based on zoom level
    const MIN_LABEL_ZOOM = 9
    function updateLabelVisibility() {
      const zoom = map.getZoom()
      Object.values(labelsRef.current).forEach(label => {
        const el = label.getElement ? label.getElement() : null
        if (el) el.style.display = zoom >= MIN_LABEL_ZOOM ? '' : 'none'
      })
    }
    map.on('zoom', updateLabelVisibility)

    return () => {
      map.off('zoom', updateLabelVisibility)
      clearAll()
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, []) // eslint-disable-line

  return <div ref={elRef} style={{ width: '100%', height: '100%' }} />
})

export default MapView
