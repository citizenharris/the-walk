# The Walk

A one-page interactive guide to the walk we take visitors on: along the South Bank from Vauxhall to the Dickens Inn at
St Katharine Docks. It's used on a phone during the walk and looked at the night before.

## Audience and voice

- Friends and family visiting London. Many are Italian.
- Written as our walk, in our voice ("we usually stop here for lunch").
- English and Italian, with an EN/IT switch. The default comes from the phone's language and the choice is remembered.
- Personal anecdotes are optional. A card with no anecdote doesn't show an empty slot.

## Hosting

- GitHub Pages, public repo `the-walk`, no custom domain.
- `<meta name="robots" content="noindex">` so search engines leave it out.
- Online only. There's no offline support or service worker.

## Layouts

Two layouts, switched with an icon in the top bar. The choice is remembered. Switching keeps the current stop.

**Sheet (default).** A full-screen map with a bottom sheet. In the peek state the sheet shows the stop name, its number
and the step from the previous stop. Swipe left and right, or tap ◄ ►, to change stop. Drag the sheet up to read the
full card. On a wide screen the sheet becomes a panel on the left over the map, and the arrow keys change stop.

**Split.** The map is fixed in the top part of the screen and the cards scroll underneath. When a card reaches the
reading line, it becomes the current stop. On a wide screen the cards are on the left and the map on the right.

In both layouts:

- Changing stop flies the map to that stop. The route up to the current stop is drawn solid red and the rest is faded.
- Tapping a stop marker on the map makes that stop current.
- A "show me" button shows a GPS dot. GPS never changes the current stop.
- A thin progress bar runs along the top.

## Route

The real walking path, generated once with the OSRM foot profile (routing.openstreetmap.de), fixed by hand along the
river and stored as `data/route.geojson`. Leake Street is a dotted detour spur off the main line. Gabriel's Wharf is
left out.

| # | Stop | Notes on the card |
|---|------|-------------------|
| 0 | Start: Vauxhall | MI6 building, Tate Britain across the river |
| 1 | Covid Memorial Wall | Lambeth Palace, passed just before |
| 2 | Big Ben & Parliament | Photo from Westminster Bridge |
| 3 | London Eye | |
| 3a | Leake Street (detour) | |
| 4 | Southbank Centre markets | Cleopatra's Needle and Somerset House across the river |
| 5 | Tate Modern | |
| 6 | Millennium Bridge & St Paul's | Step-free note |
| 7 | Shakespeare's Globe | |
| 8 | Golden Hinde | |
| 9 | Southwark Cathedral | |
| 10 | Borough Market (lunch) | Opening hours on the card |
| 11 | London Bridge | The Monument across the river |
| 12 | Hay's Galleria | Custom House across the river |
| 13 | HMS Belfast | |
| 14 | View of the City | The Gherkin, the Walkie-Talkie and the other towers |
| 15 | Tower Bridge | Glass floor (ticketed), step-free note |
| 16 | Tower of London | |
| 17 | St Katharine Docks | |
| 18 | Dickens Inn | Getting home |

"Look across" notes show a dashed sightline on the map from the stop to the sight.

## Stop cards

- A short history blurb.
- A "look for" tip.
- An optional personal note.
- One photo. Wikimedia Commons for now, resized, stored in the repo and credited. To be replaced with our own over time.
- The distance and time from the previous stop, calculated from the route.
- Step-free notes where the route has stairs.
- Tickets and opening hours as links to official sites, marked "checked Nov 2026". Borough Market's hours are written on
  the card.

There's also an opening section (the whole route, distance, time, getting to Vauxhall, wear comfortable shoes) and a
closing section (getting home from Tower Hill or Tower Gateway).

## Timing

Walking at 4 km/h, plus 5 minutes at each stop and 60 minutes for lunch at Borough Market. Paid visits inside the Tower
Bridge Exhibition and the Tower of London aren't counted.

## Look

Plain and editorial, made to be clear and easy to understand. Serif headings, a muted CARTO Positron base map and a red
route line. The title is "The Walk".

## Accessibility

- With "reduce motion" on, the map jumps to each stop instead of flying.
- Alt text on every photo.
- The sheet and its controls work with a keyboard and a screen reader.
- Step-free notes at the Millennium Bridge and Tower Bridge.

## Tech

- Plain HTML, CSS and JS with no build step.
- Each stop is a `<section>` in `index.html` with its coordinates in `data-` attributes and both languages inline
  (`lang="en"` / `lang="it"`). Interface text comes from a small dictionary in the JS.
- Leaflet is loaded from a CDN at a fixed version.
- Playwright tests cover changing stop (the map moves and the route grows), the language switch and marker taps, in both
  layouts. A data check makes sure every stop has coordinates and both languages. `package.json` is used for development
  only.
