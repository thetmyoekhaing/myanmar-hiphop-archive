#!/usr/bin/env node
/**
 * Builds a single self-contained JSON payload from the per-entity files in data/.
 *
 *   node scripts/build.mjs
 *   -> dist/myanmar-hiphop.json
 *
 * The output is shaped for two consumers:
 *   1. an LLM that is asked to generate a UI from it (see meta.guide)
 *   2. a renderer, which can use `graph` for a network view and `ui` for
 *      pre-assembled views (timeline, generations, per-artist detail) so that
 *      no id-joining logic is required on the client.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT_DIR = join(ROOT, 'dist');
const OUT_FILE = join(OUT_DIR, 'myanmar-hiphop.json');

const readJson = (name) => JSON.parse(readFileSync(join(DATA, `${name}.json`), 'utf8'));

const artists = readJson('artists');
const crews = readJson('crews');
const releases = readJson('releases');
const songs = readJson('songs');
const events = readJson('events');
const venues = readJson('venues');
const topics = readJson('topics');
const sources = readJson('sources');
const relationships = readJson('relationships');
const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'schema.json'), 'utf8'));

const PKG = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  } catch {
    return { name: 'myanmar-hiphop-data', version: readFileSync(join(ROOT, 'README.md'), 'utf8').match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '0.0.0' };
  }
})();


/* ------------------------------------------------------------------ *
 * 1. Indexes
 * ------------------------------------------------------------------ */

const byId = new Map();
const index = (rows, kind) => {
  for (const row of rows) {
    if (byId.has(row.id)) throw new Error(`Duplicate id "${row.id}" (${kind})`);
    byId.set(row.id, { ...row, kind });
  }
};

index(artists, 'artist');
index(crews, 'crew');
index(releases, 'release');
index(songs, 'song');
index(events, 'event');
index(venues, 'venue');
index(topics, 'topic');
index(sources, 'source');

const get = (id) => byId.get(id) ?? null;
const artistName = (id) => get(id)?.name ?? id;

/* ------------------------------------------------------------------ *
 * 2. Validation - fail loudly rather than shipping broken references
 * ------------------------------------------------------------------ */

const problems = [];
const need = (ids, where, field = 'sourceIds') => {
  for (const id of ids ?? []) {
    if (!get(id)) problems.push(`${where}: ${field} -> unknown id "${id}"`);
  }
};

for (const a of artists) need(a.sourceIds, `artist:${a.id}`);
for (const c of crews) {
  need(c.sourceIds, `crew:${c.id}`);
  need(c.memberIds, `crew:${c.id}`, 'memberIds');
}
for (const r of releases) {
  need(r.sourceIds, `release:${r.id}`);
  need([r.artistId], `release:${r.id}`, 'artistId');
}
for (const s of songs) {
  need(s.sourceIds, `song:${s.id}`);
  need([s.artistId], `song:${s.id}`, 'artistId');
  need(s.releaseId ? [s.releaseId] : [], `song:${s.id}`, 'releaseId');
}
for (const e of events) {
  need(e.sourceIds, `event:${e.id}`);
  need(e.venueId ? [e.venueId] : [], `event:${e.id}`, 'venueId');
  need(e.performerIds, `event:${e.id}`, 'performerIds');
}
for (const v of venues) need(v.sourceIds, `venue:${v.id}`);
for (const t of topics) need(t.sourceIds, `topic:${t.id}`);

relationships.forEach((rel, i) => {
  for (const end of [rel.from, rel.to]) {
    if (!get(end)) problems.push(`relationship[${i}] ${rel.type}: unknown endpoint "${end}"`);
  }
  if (!get(rel.source)) problems.push(`relationship[${i}] ${rel.type}: unknown source "${rel.source}"`);
});

if (problems.length) {
  console.error(`Validation failed (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * 3. Graph view (flat nodes/edges, endpoint labels pre-resolved)
 * ------------------------------------------------------------------ */

const nodes = [
  ...artists.map((a) => ({
    id: a.id,
    kind: 'artist',
    label: a.name,
    subtitle: a.type,
    year: a.activeFrom,
    city: a.city,
    aliases: a.aliases,
    sourceIds: a.sourceIds,
  })),
  ...crews.map((c) => ({
    id: c.id,
    kind: 'crew',
    label: c.name,
    subtitle: c.status,
    year: c.formed,
    city: c.city,
    sourceIds: c.sourceIds,
  })),
  ...releases.map((r) => ({
    id: r.id,
    kind: 'release',
    label: r.title,
    subtitle: r.type,
    year: r.year,
    confidence: r.confidence,
    sourceIds: r.sourceIds,
  })),
  ...songs.map((s) => ({
    id: s.id,
    kind: 'song',
    label: s.title,
    subtitle: 'song',
    year: s.year,
    sourceIds: s.sourceIds,
  })),
  ...events.map((e) => ({
    id: e.id,
    kind: 'event',
    label: e.name,
    subtitle: 'event',
    year: e.date ? Number(e.date.slice(0, 4)) : null,
    date: e.date,
    confidence: e.confidence,
    sourceIds: e.sourceIds,
  })),
  ...venues.map((v) => ({
    id: v.id,
    kind: 'venue',
    label: v.name,
    subtitle: 'venue',
    year: null,
    city: v.city,
    sourceIds: v.sourceIds,
  })),
  ...topics.map((t) => ({
    id: t.id,
    kind: 'topic',
    label: t.name,
    subtitle: t.type,
    year: null,
    sourceIds: t.sourceIds,
  })),
  ...sources.map((s) => ({
    id: s.id,
    kind: 'source',
    label: s.title,
    subtitle: s.publication,
    year: s.date ? Number(String(s.date).slice(0, 4)) : null,
    sourceType: s.type,
    url: s.url,
  })),
];

const edges = relationships.map((rel) => ({
  from: rel.from,
  fromLabel: artistName(rel.from),
  type: rel.type,
  to: rel.to,
  toLabel: get(rel.to)?.name ?? rel.to,
  toKind: get(rel.to)?.kind ?? null,
  source: rel.source,
  status: rel.status,
  confidence: rel.confidence,
}));

/* ------------------------------------------------------------------ *
 * 4. Generations
 *
 * Derived from activeFrom, with an override table for the few artists the
 * sources place explicitly. Keep the override table small and sourced.
 * ------------------------------------------------------------------ */

const GENERATION_OVERRIDE = {
  'myo-kyawt-myaing': 'prehistory',
  'sai-sai-kham-leng': 'prehistory',
  acid: '1',
  theory: '1',
  ns: '1',
  'too-big': '1',
  barbu: '1',
  'thxa-soe': '1',
  'kyaw-thu-soe': '1',
  'lin-lin': '1',
  snare: '2',
  'nay-win': '2',
  '9mm': '2',
  'project-1': '2',
  'byauk-oh': '2',
  examplz: '2',
  'g-family': '2',
  'on-track': '2',
  lee: '2',
  cyclone: '2',
  mha: '2',
  'j-me': '2',
  'bigg-y': '2',
  'g-tone': '2',
  'kyak-pha': '2',
  yatha: '2',
  'thuta-aye': '2',
  'jouk-jack': '3',
  'kyaw-htut-swe': '3',
  vip: '3',
  'ah-boy': '3',
  'htein-win-p-crew': '3',
  'hlwan-paing': '3',
};

/** Crews and associations are placed in the generation they formed in. */
const generationForCrew = (crew) =>
  crew.formed <= 1999 ? 'prehistory' : crew.formed <= 2001 ? '1' : crew.formed <= 2005 ? '2' : '3';

const GENERATION_META = {
  prehistory: {
    id: 'prehistory',
    label: 'Precursors',
    period: '1988-1999',
    summary:
      'The groundwork laid before the first records: Myo Kyawt Myaing performing from 1988, and Sai Sai Kham Leng releasing Chocolate Yaung Yayge Einmet in 2000.',
    sourceIds: ['src-wiki-burmese-hiphop', 'src-wiki-saisai'],
  },
  '1': {
    id: '1',
    label: '1st generation',
    period: '2000-2001',
    summary:
      'The first wave. Acid released Beginning (Sa-Tin-Gyin) in 2000, Burma\'s first hip-hop album, and topped the domestic charts for over two months. Theory, NS and Too Big followed.',
    sourceIds: ['src-wiki-acid', 'src-wiki-burmese-hiphop'],
  },
  '2': {
    id: '2',
    label: '2nd generation',
    period: '2001-2005',
    summary:
      'The scene consolidates: 9mm, Project-1, Byauk-Oh, Examplz, G-Family, On-Track, L.E.E, Cyclone, plus the M.H.A. association and solo acts J-Me, Bigg-Y and G-Tone. Snare and the Rap Master Nay Win anchor Snare.',
    sourceIds: ['src-wiki-burmese-hiphop', 'src-myanmore-2017'],
  },
  '3': {
    id: '3',
    label: '3rd generation',
    period: '2006-present',
    summary:
      'A new wave from late 2006: Jouk Jack, Kyaw Htut Swe, VIP / Rock$tar, Hlwan Paing, Ah Boy and Htein Win P Crew.',
    sourceIds: ['src-wiki-burmese-hiphop'],
  },
};

/** Object key order puts "1","2","3" before "prehistory", so order explicitly. */
const GENERATION_ORDER = ['prehistory', '1', '2', '3'];

const generations = GENERATION_ORDER.map((genId) => GENERATION_META[genId]).map((g) => {
  const members = artists.filter((a) => GENERATION_OVERRIDE[a.id] === g.id);
  const memberCrews = crews.filter((c) => generationForCrew(c) === g.id);
  return {
    ...g,
    artistIds: members.map((a) => a.id),
    artists: members.map((a) => ({ id: a.id, name: a.name, type: a.type, activeFrom: a.activeFrom })),
    crewIds: memberCrews.map((c) => c.id),
    crews: memberCrews.map((c) => ({ id: c.id, name: c.name, formed: c.formed, status: c.status })),
    releaseIds: releases.filter((r) => GENERATION_OVERRIDE[r.artistId] === g.id).map((r) => r.id),
    count: members.length,
  };
});

const generationOf = (id) => {
  const g = generations.find((x) => x.artistIds.includes(id) || x.crewIds.includes(id));
  return g ?? null;
};

/* ------------------------------------------------------------------ *
 * 5. Timeline
 * ------------------------------------------------------------------ */

const timelineEntries = [
  ...releases.map((r) => ({
    year: r.year,
    date: null,
    kind: 'release',
    refId: r.id,
    title: r.title,
    detail: `${r.type} by ${artistName(r.artistId)}`,
    artistIds: [r.artistId],
    sourceIds: r.sourceIds,
    confidence: r.confidence ?? null,
  })),
  ...events.map((e) => ({
    year: e.date ? Number(e.date.slice(0, 4)) : null,
    date: e.date,
    kind: 'event',
    refId: e.id,
    title: e.name,
    detail: e.note ?? `at ${get(e.venueId)?.name ?? 'venue unknown'}`,
    artistIds: e.performerIds,
    sourceIds: e.sourceIds,
    confidence: e.confidence ?? null,
  })),
  ...artists
    .filter((a) => a.activeFrom !== null)
    .map((a) => ({
      year: a.activeFrom,
      date: null,
      kind: 'artist',
      refId: a.id,
      title: a.name,
      detail: `${a.type} active from${a.city ? `, ${a.city}` : ''}`,
      artistIds: [a.id],
      sourceIds: a.sourceIds,
      confidence: null,
    })),
  ...artists
    .filter((a) => a.died)
    .map((a) => ({
      year: Number(a.died.slice(0, 4)),
      date: a.died,
      kind: 'milestone',
      refId: a.id,
      title: `${a.name} dies`,
      detail: a.born
        ? `Age ${Number(a.died.slice(0, 4)) - Number(a.born.slice(0, 4))}`
        : 'Birth date not recorded',
      artistIds: [a.id],
      sourceIds: a.sourceIds,
      confidence: null,
    })),
].sort((x, y) => (x.year ?? 9999) - (y.year ?? 9999) || (x.date ?? '').localeCompare(y.date ?? ''));

const years = [...new Set(timelineEntries.map((t) => t.year).filter(Boolean))].sort((a, b) => a - b);

const timeline = years.map((year) => ({
  year,
  entries: timelineEntries.filter((t) => t.year === year),
}));

const entryKinds = {
  release: releases.length,
  event: events.length,
  artist: artists.filter((a) => a.activeFrom !== null).length,
  milestone: artists.filter((a) => a.died).length,
};

/* ------------------------------------------------------------------ *
 * 6. Milestones + highlights (narrative anchors for a landing page)
 * ------------------------------------------------------------------ */

const milestones = [
  {
    id: 'ms-1988-pioneer',
    year: 1988,
    title: 'Myo Kyawt Myaing performing',
    text: 'The earliest figure recorded in the archive as active, treated as a pioneer of Burmese hip-hop.',
    artistIds: ['myo-kyawt-myaing'],
    sourceIds: ['src-wiki-burmese-hiphop'],
    confidence: 'medium',
  },
  {
    id: 'ms-2000-beginning',
    year: 2000,
    title: 'Acid releases Burma\'s first hip-hop album',
    text: 'Beginning (Sa-Tin-Gyin) by Acid, founded by Phyo Zeya Thaw, Annaga, Hein Zaw and Yan Yan Chan, topped the Burmese charts for more than two months.',
    artistIds: ['acid', 'phyo-zeya-thaw', 'annaga', 'hein-zaw', 'yan-yan-chan'],
    releaseIds: ['rel-beginning'],
    sourceIds: ['src-wiki-acid', 'src-wiki-burmese-hiphop'],
    confidence: 'high',
  },
  {
    id: 'ms-2000-saisai-debut',
    year: 2000,
    title: 'Sai Sai Kham Leng debuts',
    text: 'Debut album Chocolate Yaung Yayge Einmet, followed in 2001 by Thangegyin Myar Swar, which made him a star.',
    artistIds: ['sai-sai-kham-leng'],
    releaseIds: ['rel-chocolate-yaung-yayge', 'rel-thangegyin-myar-swar'],
    sourceIds: ['src-wiki-saisai'],
    confidence: 'high',
  },
  {
    id: 'ms-2003-number-one',
    year: 2003,
    title: '"One Nal Mhat Tan" hits number one',
    text: 'The track from February Mhat Tann reached number one in Myanmar.',
    artistIds: ['sai-sai-kham-leng'],
    releaseIds: ['rel-february-mhat-tann'],
    songIds: ['song-one-nal-mhat-tan'],
    sourceIds: ['src-wiki-saisai'],
    confidence: 'high',
  },
  {
    id: 'ms-2004-birthday-show',
    year: 2004,
    title: 'Sai Sai Birthday Show begins',
    text: 'Annual outdoor concert held every 10 April from 2004, a fixture of the Yangon calendar.',
    artistIds: ['sai-sai-kham-leng'],
    eventIds: ['ev-saisai-birthday-show'],
    sourceIds: ['src-wiki-saisai'],
    confidence: 'high',
  },
  {
    id: 'ms-2006-third-gen',
    year: 2006,
    title: 'Third generation emerges',
    text: 'From late 2006 a new wave appears: Jouk Jack, Kyaw Htut Swe, VIP / Rock$tar, Hlwan Paing.',
    artistIds: ['jouk-jack', 'kyaw-htut-swe', 'vip', 'hlwan-paing'],
    sourceIds: ['src-wiki-burmese-hiphop'],
    confidence: 'high',
  },
  {
    id: 'ms-2007-generation-wave',
    year: 2007,
    title: 'Generation Wave youth movement',
    text: 'Phyo Zeya Thaw is documented as part of Generation Wave, a youth movement rather than a rap group.',
    artistIds: ['phyo-zeya-thaw'],
    crewIds: ['generation-wave'],
    sourceIds: ['src-wiki-acid'],
    confidence: 'high',
  },
  {
    id: 'ms-2017-reunion',
    year: 2017,
    title: 'Acid reunion at The Clubhouse',
    text: 'Straight Outta Yangon: Chapter 2, an ACID reunion show in Yangon, and the subject of Insight Myanmar episode 604.',
    artistIds: ['acid'],
    eventIds: ['ev-straight-outta-yangon-2'],
    venueIds: ['ven-clubhouse'],
    sourceIds: ['src-coconuts-2017', 'src-insight-604'],
    confidence: 'medium',
  },
];

const highlights = {
  pioneers: artists.filter((a) => a.activeFrom !== null && a.activeFrom <= 2000).map((a) => a.id),
  firstAlbum: releases.find((r) => r.id === 'rel-beginning') ?? null,
  longestRunningReleaseSeries: {
    artistId: 'sai-sai-kham-leng',
    artistName: 'Sai Sai Kham Leng',
    releaseIds: releases.filter((r) => r.artistId === 'sai-sai-kham-leng').map((r) => r.id),
    span: '2000-2012',
  },
  cities: [...new Set(artists.map((a) => a.city).filter(Boolean))].sort(),
  yearRange: [years[0] ?? null, years[years.length - 1] ?? null],
};

/* ------------------------------------------------------------------ *
 * 7. Per-entity detail bundles (fully denormalized)
 * ------------------------------------------------------------------ */

const outgoing = (from) => relationships.filter((r) => r.from === from);
const incoming = (to) => relationships.filter((r) => r.to === to);

const detail = {};

for (const a of artists) {
  const discography = releases.filter((r) => r.artistId === a.id);
  detail[a.id] = {
    id: a.id,
    kind: 'artist',
    name: a.name,
    type: a.type,
    city: a.city,
    activeFrom: a.activeFrom,
    activeTo: a.activeTo,
    born: a.born ?? null,
    died: a.died ?? null,
    aliases: a.aliases,
    generation: generationOf(a.id)?.id ?? null,
    generationLabel: generationOf(a.id)?.label ?? null,
    crews: crews
      .filter((c) => c.memberIds.includes(a.id))
      .map((c) => ({ id: c.id, name: c.name, role: 'member' })),
    groups: outgoing(a.id)
      .filter((r) => r.type === 'member_of')
      .map((r) => ({ id: r.to, name: artistName(r.to), kind: get(r.to)?.kind ?? null })),
    releases: discography.map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year,
      type: r.type,
      confidence: r.confidence ?? null,
    })),
    songs: songs.filter((s) => s.artistId === a.id).map((s) => ({ id: s.id, title: s.title, year: s.year, note: s.note ?? null })),
    events: events
      .filter((e) => e.performerIds.includes(a.id))
      .map((e) => ({ id: e.id, name: e.name, date: e.date, venue: get(e.venueId)?.name ?? null })),
    relations: outgoing(a.id).map((r) => ({ type: r.type, to: r.to, toLabel: get(r.to)?.name ?? r.to, status: r.status, confidence: r.confidence })),
    mentionedBy: incoming(a.id).map((r) => ({ type: r.type, from: r.from, fromLabel: get(r.from)?.name ?? r.from, status: r.status })),
    sources: a.sourceIds.map((id) => ({ id, title: get(id)?.title ?? id, publication: get(id)?.publication ?? null, url: get(id)?.url ?? null })),
  };
}

for (const c of crews) {
  detail[c.id] = {
    id: c.id,
    kind: 'crew',
    name: c.name,
    formed: c.formed,
    city: c.city,
    status: c.status,
    generation: generationOf(c.id)?.id ?? null,
    generationLabel: generationOf(c.id)?.label ?? null,
    members: c.memberIds.map((id) => ({ id, name: artistName(id), type: get(id)?.type ?? null })),
    relations: [...outgoing(c.id), ...incoming(c.id)].map((r) => ({
      type: r.type,
      from: r.from,
      to: r.to,
      status: r.status,
      confidence: r.confidence,
    })),
    sources: c.sourceIds.map((id) => ({ id, title: get(id)?.title ?? id, publication: get(id)?.publication ?? null, url: get(id)?.url ?? null })),
  };
}

for (const r of releases) {
  detail[r.id] = {
    id: r.id,
    kind: 'release',
    title: r.title,
    type: r.type,
    year: r.year,
    artist: { id: r.artistId, name: artistName(r.artistId) },
    songs: songs.filter((s) => s.releaseId === r.id).map((s) => ({ id: s.id, title: s.title, year: s.year, note: s.note ?? null })),
    confidence: r.confidence ?? null,
    sources: r.sourceIds.map((id) => ({ id, title: get(id)?.title ?? id, publication: get(id)?.publication ?? null, url: get(id)?.url ?? null })),
  };
}

for (const s of songs) {
  detail[s.id] = {
    id: s.id,
    kind: 'song',
    title: s.title,
    year: s.year,
    note: s.note ?? null,
    artist: { id: s.artistId, name: artistName(s.artistId) },
    release: s.releaseId ? { id: s.releaseId, title: get(s.releaseId)?.title ?? s.releaseId } : null,
    sources: s.sourceIds.map((id) => ({ id, title: get(id)?.title ?? id, url: get(id)?.url ?? null })),
  };
}

for (const e of events) {
  detail[e.id] = {
    id: e.id,
    kind: 'event',
    name: e.name,
    date: e.date,
    venue: e.venueId ? { id: e.venueId, name: get(e.venueId)?.name ?? e.venueId, city: get(e.venueId)?.city ?? null } : null,
    performers: e.performerIds.map((id) => ({ id, name: artistName(id) })),
    note: e.note ?? null,
    confidence: e.confidence ?? null,
    sources: e.sourceIds.map((id) => ({ id, title: get(id)?.title ?? id, url: get(id)?.url ?? null })),
  };
}

/* ------------------------------------------------------------------ *
 * 8. Facets
 * ------------------------------------------------------------------ */

const tally = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v === null || v === undefined || v === '') continue;
      acc[v] = (acc[v] ?? 0) + 1;
    }
    return acc;
  }, {});

const facets = {
  artistType: tally(artists, 'type'),
  artistCity: tally(artists, 'city'),
  generation: tally(artists, (a) => generationOf(a.id)?.id ?? null),
  releaseType: tally(releases, 'type'),
  sourceType: tally(sources, 'type'),
  relationshipType: tally(relationships, 'type'),
  relationshipStatus: tally(relationships, 'status'),
  relationshipConfidence: tally(relationships, 'confidence'),
  releaseConfidence: tally(releases, 'confidence'),
  eventConfidence: tally(events, 'confidence'),
  activeByYear: years.map((year) => ({
    year,
    count: artists.filter((a) => a.activeFrom !== null && a.activeFrom <= year && (a.activeTo === null || a.activeTo >= year)).length,
  })),
};

/* ------------------------------------------------------------------ *
 * 9. Assemble
 * ------------------------------------------------------------------ */

const output = {
  meta: {
    name: 'Myanmar Hip-Hop Open Data Archive',
    slug: PKG.name,
    version: PKG.version,
    license: 'Open Data Commons Attribution-ShareAlike 4.0 (ODbL-style, CC BY-SA 4.0 for non-database uses)',
    licenseFile: 'LICENSE.txt',
    readme: 'README.md',
    jsonSchema: 'schema/schema.json',
    language: 'en',
    secondaryLanguage: 'my',
    scope: 'Yangon-centred history of Myanmar / Burmese hip-hop: artists, crews, releases, songs, events, venues, topics, sources and typed relationships.',
    generatedAt: new Date().toISOString(),
    counts: {
      artists: artists.length,
      crews: crews.length,
      releases: releases.length,
      songs: songs.length,
      events: events.length,
      venues: venues.length,
      topics: topics.length,
      sources: sources.length,
      relationships: relationships.length,
      milestones: milestones.length,
      generations: generations.length,
    },
    provenance: {
      model:
        'Every claim carries at least one source id. `status` on relationships is one of VERIFIED (human-checked), AI_EXTRACTED (pending review), CONFLICTED, REJECTED. `confidence` is high | medium | low.',
      statusValues: ['VERIFIED', 'AI_EXTRACTED', 'CONFLICTED', 'REJECTED'],
      confidenceValues: ['high', 'medium', 'low'],
      copyright:
        'Factual metadata only (names, dates, places). No article text, lyrics or images are redistributed. Copyrighted sources are cited for facts only.',
      caveat:
        'Entities marked confidence low or status AI_EXTRACTED have not been human-verified. Render these with a visible "unverified" affordance.',
    },
    guide: {
      purpose:
        'Single-file JSON for LLM consumption and UI generation. All cross-references are already resolved: nothing needs joining at render time.',
      readOrder: ['meta', 'ui', 'entities', 'graph', 'entityDetail', 'schema'],
      sections: {
        meta: 'Counts, licence, provenance rules, and this guide.',
        ui: 'Pre-assembled views: generations, timeline, milestones, highlights, facets. Start here for layout work.',
        entities: 'Canonical records exactly as stored in data/*.json.',
        graph: 'Flat nodes/edges with human-readable labels on every endpoint. For force-directed or matrix network views.',
        entityDetail: 'Denormalized per-entity bundles: discography, crews, songs, events, relations, resolved sources. Keyed by entity id.',
        schema: 'Field definitions and data rules from schema/schema.json.',
      },
      renderingHints: [
        'entities.artists and ui.generations are the primary navigation: group by generation, or by city (all Yangon).',
        'ui.timeline is pre-sorted by year; render as a vertical or horizontal chronology.',
        'entityDetail["acid"] and entityDetail["sai-sai-kham-leng"] are the two deepest profiles and make good hero/detail pages.',
        'graph.edges[].status and .confidence let you dim unverified links without extra lookups.',
        'ui.facets.activeByYear is a ready-made activity series for a chart.',
        'Sort any people-facing list by year; id slugs are for keys only, never for display.',
        'Burmese-script aliases live in entities.artists[].aliases - keep them, do not transliterate.',
      ],
      keyArtists: ['acid', 'sai-sai-kham-leng', 'phyo-zeya-thaw', 'yan-yan-chan', 'annaga', 'hein-zaw', 'nay-win', 'myo-kyawt-myaing'],
      keyReleases: ['rel-beginning', 'rel-chocolate-yaung-yayge', 'rel-thangegyin-myar-swar', 'rel-february-mhat-tann', 'rel-date-date-kye'],
      keyEvents: ['ev-straight-outta-yangon-2', 'ev-saisai-birthday-show'],
    },
  },

  ui: {
    headline: 'Myanmar Hip-Hop: a sourced timeline of Yangon rap',
    summary:
      'From the first album in 2000 to a 2017 reunion show, this is an open, source-attributed archive of Myanmar hip-hop. Every fact links back to a citation, and every citation is marked verified, medium or low confidence.',
    generations,
    timeline,
    timelineEntryKinds: entryKinds,
    milestones,
    highlights,
    facets,
  },

  entities: {
    artists,
    crews,
    releases,
    songs,
    events,
    venues,
    topics,
    sources,
  },

  graph: { nodes, edges },

  entityDetail: detail,

  schema,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`);

const kb = (JSON.stringify(output).length / 1024).toFixed(1);
console.log(`OK  ${OUT_FILE}  (${kb} kB)`);
console.log(
  Object.entries(output.meta.counts)
    .map(([k, v]) => `${k}=${v}`)
    .join('  '),
);
