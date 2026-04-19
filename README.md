# TrailBlazer

TrailBlazer is a hiking trail finder and GPS tracking app focused on fast discovery, map-based exploration, and lightweight on-trail guidance.

It combines real map data, location search, breadcrumb tracking, offline trail saving, hike history, and optional AI-generated safety tips in a mobile-friendly interface.

## What it does

- Finds trails around your current location, a searched address, or a dropped map pin
- Uses official Swiss trail data when you are in Switzerland
- Falls back to OpenStreetMap trail data worldwide
- Tracks your hike with breadcrumbs, duration, and calories burned
- Stores completed hikes in local history
- Lets you save trails offline for later access
- Shows route geometry and turn-style navigation steps when available
- Optionally adds short AI safety tips for the selected trail

## Data Sources

TrailBlazer prioritizes trail sources in this order:

1. `geo.admin.ch` for Switzerland
2. Overpass / OpenStreetMap for broader trail discovery
3. Gemini-generated fallback trail suggestions when structured data is missing

Routing uses OSRM and address search uses Nominatim.

## Quick Start

Prerequisites:
- Node.js
- Optional Gemini API key exposed as `API_KEY` for AI safety tips and AI fallback trail generation

Run locally:

```bash
npm install
npm run dev
```

If you want the AI features enabled:

```bash
API_KEY=your_key npm run dev
```

## Core Features

- Search and recenter map by address
- Long-press map to search for trails around a custom point
- Start / stop hike tracking with live breadcrumbs
- Estimate duration and calories based on user settings
- Save and review hike history
- Download or remove offline trail entries
- Auto-switch to Swisstopo-style data flow inside Switzerland

## Project Structure

- `App.tsx` — main app flow, tracking, filters, UI state
- `components/Map*` — map rendering and map interactions
- `utils/geoUtils.ts` — geocoding, routing, trail fetching, AI fallback
- `utils/storage.ts` — local persistence for offline trails and hike history
- `types.ts` / `constants.ts` — shared models and app settings

## Status

Prototype / MVP. Best suited for exploring the product direction and validating the overall hiking workflow rather than acting as a full production-grade outdoor navigation app.
