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
const disputes = readJson('disputes');
const periods = readJson('periods');
const images = readJson('images');
const editorial = readJson('editorial');
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
index(periods, 'period');
index(images, 'image');

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
const needKind = (ids, kind, where, field) => {
  for (const id of ids ?? []) {
    const row = get(id);
    if (row && row.kind !== kind) problems.push(`${where}: ${field} -> "${id}" is a ${row.kind}, expected ${kind}`);
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

periods.forEach((p, i) => {
  if (!p.sourceIds?.length) problems.push(`period[${i}] ${p.id}: no sourceIds`);
  need(p.sourceIds, `period:${p.id}`);
  need(p.artistIds, `period:${p.id}`, 'artistIds');
  needKind(p.artistIds, 'artist', `period:${p.id}`, 'artistIds');
  need(p.crewIds, `period:${p.id}`, 'crewIds');
  needKind(p.crewIds, 'crew', `period:${p.id}`, 'crewIds');
  if (!p.imageId) problems.push(`period[${i}] ${p.id}: no imageId`);
  else if (!get(p.imageId)) problems.push(`period[${i}] ${p.id}: unknown imageId "${p.imageId}"`);
  if (p.fromYear > p.toYear) problems.push(`period[${i}] ${p.id}: fromYear > toYear`);
});

images.forEach((img, i) => {
  if (!img.sourceIds?.length) problems.push(`image[${i}] ${img.id}: no sourceIds`);
  need(img.sourceIds, `image:${img.id}`);
});

/**
 * Disputes are claims, so the checks are about evidence discipline rather than
 * reference integrity: every dispute needs a claim and sources, and any party
 * that resolves to an entity must be a real entity.
 */
disputes.forEach((d, i) => {
  if (!d.sourceIds?.length) problems.push(`dispute[${i}] ${d.id}: no sourceIds`);
  need(d.sourceIds, `dispute:${d.id}`);
  if (!d.claim) problems.push(`dispute[${i}] ${d.id}: no claim`);
  if (!d.corroboration) problems.push(`dispute[${i}] ${d.id}: no corroboration statement`);
  if (!['settled', 'disputed', 'unresolved', 'structurally unresolved'].includes(d.status)) {
    problems.push(`dispute[${i}] ${d.id}: unknown status "${d.status}"`);
  }
  for (const p of d.parties ?? []) {
    if (!get(p)) problems.push(`dispute[${i}] ${d.id}: unknown party "${p}"`);
  }
  // A REJECTED-or-claimed feud must not be recorded without saying who claims it.
  if (d.type === 'diss track' && !d.response) {
    // A missing response is legitimate; it just must not be implied to be a reply.
  }
});

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
    quality: s.quality ?? null,
    url: s.url,
  })),
  ...periods.map((p) => ({
    id: p.id,
    kind: 'period',
    label: p.label,
    subtitle: p.range,
    year: p.fromYear,
    sourceIds: p.sourceIds,
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
  note: rel.note ?? null,
}));

/**
 * Dispute edges, kept in their own list rather than merged into `graph.edges`.
 *
 * Merging them would be a lie about the data: a beef is a CLAIM with an
 * evidentiary status, not a fact about two artists. A renderer that wants a
 * conflict view can use these; one that wants a clean collaboration graph can
 * ignore them. Every edge carries `disputeId` so the claim can be traced back.
 */
const disputeEdges = disputes.flatMap((d) => {
  const from = (d.parties ?? []).map((id) => ({
    id,
    label: get(id)?.name ?? id,
    kind: get(id)?.kind ?? null,
    /** A REJECTED status here means the archive recorded a non-association. */
    relation: d.type === 'crew exit' ? 'departed' : 'party',
  }));
  return from.map((f) => ({
    disputeId: d.id,
    type: d.type,
    from: f.id,
    fromLabel: f.label,
    fromKind: f.kind,
    relation: f.relation,
    to: null,
    toLabel: d.targetDescription ?? null,
    period: d.period,
    status: d.status,
    corroboration: d.corroboration,
    safety: d.safety ?? null,
    sourceIds: d.sourceIds,
  }));
});

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

  /**
   * Fourth and fifth generation.
   *
   * These two buckets are NOT Wikipedia's taxonomy. The Burmese hip-hop
   * article covers only three generations, so it cannot support a 4G or 5G
   * claim. The 4G placement rests on ONE source: Yung Hugo telling HipHopDX
   * in March 2022 "I'm fourth-generation". Wikipedia calling Ah Boy a
   * "pioneer of the third generation" implies a fourth exists as a category,
   * and MYANMORE's 2018 Jimmy Jacobs piece says "a new hip hop generation
   * has arrived", but neither enumerates one.
   *
   * So 4G and 5G are marked `asserted` rather than `sourced`, and a renderer
   * should present them as artist- and press-asserted framing, not fact. If
   * you add a source that enumerates these generations, promote them to
   * `sourced` and cite it here.
   */
  'hlwan-paing': '3',

  'phyo-layy': '4',
  'yzet': '4',
  'oasix': '4',
  'htet-yan': '4',
  'x-boxin': '4',
  'zay-ye': '4',
  'bo-htet': '4',
  'jimmy-jacobs': '4',
  'yung-hugo': '4',
  'g-fatt': '4',
  'floke-rose': '4',
  'g-latt': '4',
  'moe-htet': '4',
  'bobby-soxer': '4',
  'lil-kee-boi': '5',
  '223': '5',
  'ah-sar': '5',
  murkio: '5',
  'myat-amara-maung': '5',
  reload: '5',
  'mossberg-arki': '5',
  wink: '5',
  'bkho-bain': '5',
  yan: '5',
  '99-symphony': '5',
  'yair-yint-aung': '5',
  'gracee': '5',
  adjustor: '5',
  trigger: '5',
  'arr-g': '5',
  kn: '5',
  '13-three': '5',
};

/**
 * Crews, labels and associations are placed in the generation they formed in.
 * A crew with no recorded formation date is left out rather than guessed at.
 */
const generationForCrew = (crew) => {
  if (crew.formed === null || crew.formed === undefined) return null;
  return crew.formed <= 1999 ? 'prehistory' : crew.formed <= 2001 ? '1' : crew.formed <= 2005 ? '2' : crew.formed <= 2016 ? '3' : crew.formed <= 2020 ? '4' : '5';
};

const GENERATION_META = {
  prehistory: {
    id: 'prehistory',
    label: 'Precursors',
    period: '1988-1999',
    summary:
      'The groundwork laid before the first records: Myo Kyawt Myaing performing from 1988, and Sai Sai Kham Leng releasing Chocolate Yaung Yayge Einmet in 2000.',
    sourceIds: ['src-wiki-burmese-hiphop', 'src-wiki-saisai'],
    /** 'sourced' = the sources enumerate this generation. */
    basis: 'sourced',
  },
  '1': {
    id: '1',
    label: '1st generation',
    period: '2000-2001',
    summary:
      'The first wave. Acid released Beginning (Sa-Tin-Gyin) in 2000, Burma\'s first hip-hop album, and topped the domestic charts for over two months. Theory, NS and Too Big followed.',
    sourceIds: ['src-wiki-acid', 'src-wiki-burmese-hiphop'],
    /** 'sourced' = the sources enumerate this generation. */
    basis: 'sourced',
  },
  '2': {
    id: '2',
    label: '2nd generation',
    period: '2001-2005',
    summary:
      'The scene consolidates: 9mm, Project-1, Byauk-Oh, Examplz, G-Family, On-Track, L.E.E, Cyclone, plus the M.H.A. association and solo acts J-Me, Bigg-Y and G-Tone. Snare and the Rap Master Nay Win anchor Snare.',
    sourceIds: ['src-wiki-burmese-hiphop', 'src-myanmore-2017'],
    /** 'sourced' = the sources enumerate this generation. */
    basis: 'sourced',
  },
  '3': {
    id: '3',
    label: '3rd generation',
    period: '2006-2016',
    summary:
      'A new wave from late 2006: Jouk Jack, Kyaw Htut Swe, VIP / Rock$tar, Hlwan Paing, Ah Boy and Htein Win P Crew. In late 2008 and early 2009 many third-generation groups released their sample albums.',
    sourceIds: ['src-wiki-burmese-hiphop', 'src-wiki-ah-boy'],
    /** 'sourced' = the sources enumerate this generation. */
    basis: 'sourced',
  },
  4: {
    id: '4',
    label: '4th generation',
    period: '2009-2020',
    summary:
      'The underground-tape generation, and the first cohort to reach the mainstream. Mandalay\'s Wildboy crew produced Oasix and Y-Zet; Yangon\'s tape and VCD circuit ran through B-Clipz, MRC, Y.H.S and B-Lord Family, with a parallel live scene at Jam It! and the Full Stop shows. Oasix and Y-Zet came out of Wildboy; Htet Yan, X-Boxin, Zay Ye\', Bo Htet, G Fatt and Floke Rose followed, and Yung Hugo\'s Make Karen Great Again (2023) marks ethnic-language rap as a fourth-generation marker. Trap took years to be accepted: Yung Hugo, "It has only been a few years since people accepted trap music here."',
    sourceIds: ['src-wiki-oasix', 'src-wiki-yzet', 'src-hiphopdx-yunghugo', 'src-myanmore-rangoon-rhythm-jimmy', 'src-myanmore-underground-2015'],
    /**
     * `asserted`, not `sourced`: the Burmese hip-hop Wikipedia article covers
     * only three generations. The 4G label rests on Yung Hugo's own statement
     * to HipHopDX plus MYANMORE's "a new hip hop generation has arrived".
     * Present as framing, not as a sourced taxonomy.
     */
    basis: 'asserted',
    caveat:
      'No cited source enumerates a fourth generation. The label is artist-asserted (Yung Hugo: "I\'m fourth-generation") and press-asserted (MYANMORE, 2018). Wikipedia calling Ah Boy a "pioneer of the third generation" implies a fourth is a recognised category, but does not list one.',
  },
  5: {
    id: '5',
    label: 'New wave',
    period: '2018-present',
    summary:
      'A platform-native generation organised by label rather than crew or city. Billionaire Minds Group is the dominant copyright network across the 2023-2026 cohort, with Eagle Element (Lil Kee Boi, Ah Sar) and b4 Records (Wink, bkho bain) alongside it. The sound is trap, drill and Jersey Club: LIFTED\'s 2023 scene report highlights a four-way drill cut and a Jersey Club collaboration with 223. Two diaspora strands run through it - Lil Kee Boi from Bago to Munich, and Myat Amara Maung, Reload and Yan working out of the BMG network. The names themselves call it "Burma\'s new wave rap scene".',
    sourceIds: ['src-lifted-2023', 'src-apple-ah-sar', 'src-spotify-lil-kee-boi', 'src-apple-mossberg-arki'],
    /**
     * `asserted`, and more so than 4G: this is the archive\'s own editorial
     * bucket for a label-network generation the sources describe but never
     * enumerate by name. "New wave" is the artists\' own phrase.
     */
    basis: 'asserted',
    caveat:
      'An editorial grouping, not a cited taxonomy. Built from label structure and LIFTED scene reporting rather than from any source that lists a fifth generation. The 2018-2022 boundary overlaps the fourth generation and is the least certain date in this table.',
  },
};

/** Object key order is not chronological, so order explicitly. */
const GENERATION_ORDER = ['prehistory', '1', '2', '3', 4, 5];

const generations = GENERATION_ORDER.map((genId) => GENERATION_META[genId]).map((g) => {
  const members = artists.filter((a) => GENERATION_OVERRIDE[a.id] === g.id);
  const memberCrews = crews.filter((c) => generationForCrew(c) === g.id);
  return {
    ...g,
    artistIds: members.map((a) => a.id),
    artists: members.map((a) => ({ id: a.id, name: a.name, type: a.type, activeFrom: a.activeFrom, city: a.city })),
    crewIds: memberCrews.map((c) => c.id),
    crews: memberCrews.map((c) => ({ id: c.id, name: c.name, kind: c.kind, formed: c.formed, status: c.status })),
    releaseIds: releases.filter((r) => GENERATION_OVERRIDE[r.artistId] === g.id).map((r) => r.id),
    count: members.length,
  };
});

/** Artists the override table places in 4G/5G but with no activeFrom to check against. */
const unplacedInTime = artists.filter((a) => ['4', '5'].includes(GENERATION_OVERRIDE[a.id]) && a.activeFrom === null);

/**
 * The generation buckets above are Wikipedia's taxonomy. The periods below are
 * a different, editorial axis: a coarser navigation spine that reaches past
 * 2010, where the dataset is thinnest. Both ship, and each is labelled, so a
 * renderer can offer one or the other without the two being conflated.
 */
const resolvedPeriods = periods.map((p) => {
  const image = get(p.imageId);
  const crewIds = p.crewIds ?? [];
  return {
    ...p,
    /**
     * The period's own alt/credit win over the asset defaults, because one
     * image file is captioned differently in different periods.
     */
    image: image
      ? {
          id: image.id,
          path: image.path,
          alt: p.imageAlt ?? image.alt,
          credit: p.imageCredit ?? image.credit,
          note: image.note,
        }
      : null,
    /** One flat list the UI can render without knowing about the artist/crew split. */
    names: [
      ...p.artistIds.map((id) => artistName(id)),
      ...crewIds.map((id) => get(id)?.name ?? id),
      ...(p.artistNames ?? []),
    ],
    /** Names with no entity record yet - the archive's visible gaps, not omissions. */
    unlinkedNames: p.artistNames ?? [],
    crewNames: crewIds.map((id) => get(id)?.name ?? id),
    eventNotes: p.eventNotes ?? [],
    sources: p.sourceIds.map((id) => ({
      id,
      title: get(id)?.title ?? id,
      publication: get(id)?.publication ?? null,
      quality: get(id)?.quality ?? null,
      url: get(id)?.url ?? null,
    })),
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

/**
 * Narrative anchors for a landing page, chronological. Each needs at least
 * one cited source, and the fourth-generation and post-coup entries are the
 * ones that make the archive more than a Wikipedia mirror.
 */
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
  {
    id: 'ms-2011-oasix-first',
    year: 2011,
    title: 'Oasix releases his first solo mixtape',
    text:
      'While still a university student and a member of Mandalay crew Wildboy, Oasix released "The First", then "The Running" in 2013. His Wikipedia biography titles the phase "2009-2013: Career beginnings in underground", which makes this the archive\'s clearest documented pipeline from the underground tape scene to the mainstream.',
    artistIds: ['oasix'],
    crewIds: ['wildboy'],
    sourceIds: ['src-wiki-oasix'],
    confidence: 'high',
  },
  {
    id: 'ms-2015-oasix-mainstream',
    year: 2015,
    title: 'Oasix reaches nationwide recognition',
    text:
      'The duet album "Pyaw San Par (Just say it)" with Y-Zet, released 24 December 2015, brought nationwide recognition, with hit songs and a run of commercial and concert work across Myanmar. Oasix\'s solo album "1992" followed in December 2018.',
    artistIds: ['oasix', 'yzet'],
    releaseIds: ['rel-pyaw-san-par'],
    sourceIds: ['src-wiki-oasix'],
    confidence: 'high',
  },
  {
    id: 'ms-2012-jamit',
    year: 2012,
    title: 'Jam It! begins as an acoustic gig in Kan Daw Gyi Park',
    text:
      'Eaiddhi and Ye Ngwe Soe started Jam It! as an acoustic show late 2012. By 2015 it had run 20+ gigs across Yangon and Mandalay with 40+ acts, booking punk, hard rock, metal and hip hop on the same bill alongside live graffiti artists - the best-documented underground live platform in the archive.',
    artistIds: ['eaiddhi', 'ye-ngwe-soe'],
    crewIds: ['jam-it'],
    eventIds: ['ev-jamit-first-2012'],
    venueIds: ['ven-kandawgyi-park'],
    sourceIds: ['src-jam-it-about', 'src-myanmore-underground-2015'],
    confidence: 'high',
  },
  {
    id: 'ms-2018-nway-thwar-tal',
    year: 2018,
    title: '"Nway Thwar Tal" breaks out on TikTok',
    text:
      'The #1 single from Htet Yan and Thar Thar\'s album "Shae Mhi Nout Mhi" went viral on TikTok in early 2019 with more than 50,000 user videos, and was later sampled in an Imagine Dragons melody. The clearest documented case of a short-form-video breakout carrying a Burmese underground act into the mainstream.',
    artistIds: ['htet-yan', 'thar-thar'],
    releaseIds: ['rel-htetyan-shae'],
    eventIds: [],
    sourceIds: ['src-coconuts-imagine-dragons', 'src-wiki-htet-yan'],
    confidence: 'high',
  },
  {
    id: 'ms-2021-coup-scene',
    year: 2021,
    title: 'The coup and the resistance scene',
    text:
      'After the 1 February 2021 coup, rap became the most visible form of cultural resistance. Rap Against Junta formed from street concerts in Yangon, releasing DICKCOUNCIL in October 2021; Louz Xa Lone released "The Voices" on Facebook on 3 February; Vanzzzo, in Indianapolis, released "Rebel (Save Myanmar)" in March. Myanmar then cut the internet for weeks, which pushed the scene onto Bandcamp, YouTube and Spotify - making the international platforms the de facto archive of the movement.',
    artistIds: ['rap-against-junta', 'louz-xa-lone', 'vanzzzo', 'ko-aye-win', 'be-amby', 'meemi'],
    releaseIds: ['rel-raj-dickcouncil', 'rel-raj-thevoices', 'rel-vanzzzo-rebel', 'rel-meemi-wegotthis'],
    eventIds: ['ev-raj-firstshow-2021', 'ev-raj-dickcouncil-party-2021'],
    sourceIds: ['src-vice-raj-2023', 'src-globalvoices-2021', 'src-raj-dickcouncil', 'src-wired-shutdown-2021', 'src-guardian-vpn-2021'],
    confidence: 'high',
  },
  {
    id: 'ms-2022-zayar-thaw',
    year: 2022,
    title: 'Phyo Zeya Thaw executed; his unfinished track released posthumously',
    text:
      'ACID co-founder and Generation Wave member Phyo Zeya Thaw was executed on 25 July 2022, aged 41 - reported as the first use of capital punishment in Myanmar in decades. In 2023 Rap Against Junta released his unfinished "Generation Driven by Faith", built around a voice note in which he says he wrote the bars in prison and never completed them. A 2026 documentary, "The Rapper and the Junta" by Thomas Dandois, is about him.',
    artistIds: ['phyo-zeya-thaw', 'rap-against-junta'],
    releaseIds: ['rel-zayarthaw-faith'],
    sourceIds: ['src-nyt-zayar-thaw-2022', 'src-lifted-2023', 'src-dw-rapper-junta-2026'],
    confidence: 'high',
  },
  {
    id: 'ms-2023-byu-har',
    year: 2023,
    title: 'Byu Har sentenced to 20 years',
    text:
      'The rapper Byu Har, described by the BBC as one of Myanmar\'s biggest hip-hop artists and the son of songwriter Naing Myanmar, was arrested on 24 May 2023 after a Facebook Live criticising power cuts. He was held at North Dagon Police Station and sentenced to 20 years on 24 August 2023. Press reports charge incitement under Penal Code art. 505(a) and a treason statute, but the specific conviction was not confirmed at the time of reporting. He is not a member of Rap Against Junta.',
    artistIds: ['byu-har'],
    sourceIds: ['src-bbc-byu-har-2023', 'src-rfa-byu-har-2023'],
    confidence: 'high',
  },
  {
    id: 'ms-2024-diaspora-mob-party',
    year: 2024,
    title: 'MOB Party documents the Chiang Mai exile scene',
    text:
      'The third MOB Party, held 30 November 2024 at a parking lot near Tha Phae Gate in Chiang Mai, brought together Thai, Myanmar and international artists. Organiser Kan Kyi frames the event as building artist relations across Southeast Asia and raising funds for stateless children at risk from displacement. DVB is the only outlet with a sustained record of this scene.',
    artistIds: ['kan-kyi'],
    crewIds: ['triple-edge-cm'],
    eventIds: ['ev-mob-party-2024'],
    venueIds: ['ven-cool-muang'],
    sourceIds: ['src-dvb-mob-2024', 'src-dvb-mob-2024-scene', 'src-dvb-mob-2025'],
    confidence: 'high',
  },
  {
    id: 'ms-2025-overflow-arrests',
    year: 2025,
    title: 'Sixteen charged after the Overflow Music Festival',
    text:
      'bkho bain and Wink performed at the Overflow Music Festival at Eastern Yangon Event Park on 2 November 2025. Police arrested participants between 5 and 6 November and charged 16 people under Myanmar Penal Code ss. 505(b) and 294, with arrests across three Yangon townships. One of the clearest documented instances of legal repression of a live hip-hop event.',
    artistIds: ['bkho-bain', 'wink'],
    eventIds: ['ev-overflow-2025'],
    venueIds: ['ven-overflow-park'],
    sourceIds: ['src-eleven-overflow-2025'],
    confidence: 'high',
  },
].sort((x, y) => x.year - y.year || x.id.localeCompare(y.id));

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
  /** The clearest documented underground-to-mainstream pipeline. */
  undergroundToMainstream: {
    crew: 'wildboy',
    crewName: 'Wildboy (Wildboyz Entertainment)',
    city: 'Mandalay',
    memberIds: ['oasix', 'yzet'],
    note: 'Oasix and Y-Zet both began in the same Mandalay underground crew and both reached the mainstream; Oasix\'s debut album was a duet with Y-Zet.',
  },
  /** Records that exist only as mixtapes, tapes and VCDs - the hardest to find. */
  mixtapeArtists: [...new Set(releases.filter((r) => r.type === 'mixtape').map((r) => r.artistId))].map((id) => artistName(id)),
  /** The two cities that actually carry the scene, by artist count. */
  sceneCities: Object.entries(
    artists.reduce((acc, a) => {
      if (!a.city) return acc;
      acc[a.city] = (acc[a.city] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]),
};

/* ------------------------------------------------------------------ *
 * 7. Per-entity detail bundles (fully denormalized)
 * ------------------------------------------------------------------ */

const outgoing = (from) => relationships.filter((r) => r.from === from);
const incoming = (to) => relationships.filter((r) => r.to === to);

const detail = {};

for (const a of artists) {
  const gen = generationOf(a.id);
  // Joint billings count as this artist's releases too, or a duet album
  // (Oasix & Y-Zet, Trigger & 223) would appear on only one of two profiles.
  const ownDiscography = releases.filter((r) => r.artistId === a.id);
  const jointDiscography = releases.filter((r) => r.artistIdB === a.id);
  const discography = [...ownDiscography, ...jointDiscography];
  const artistCredits = (r) => ({
    id: r.id,
    title: r.title,
    year: r.year,
    yearNote: r.yearNote ?? null,
    type: r.type,
    labelId: r.labelId ?? null,
    trackCount: r.trackCount ?? null,
    confidence: r.confidence ?? null,
    billing: r.artistId === a.id ? (r.artistIdB ? 'co-lead' : 'lead') : 'co-lead',
    coArtist: r.artistId === a.id && r.artistIdB ? { id: r.artistIdB, name: artistName(r.artistIdB) } : r.artistIdB && r.artistId ? { id: r.artistId, name: artistName(r.artistId) } : null,
  });
  detail[a.id] = {
    id: a.id,
    kind: 'artist',
    name: a.name,
    type: a.type,
    city: a.city,
    base: a.base ?? null,
    /** Whether the diaspora base differs from the city of origin. */
    isDiaspora: Boolean(a.base) && Boolean(a.city) && a.base !== a.city,
    activeFrom: a.activeFrom,
    activeTo: a.activeTo,
    born: a.born ?? null,
    died: a.died ?? null,
    aliases: a.aliases,
    /**
     * Carried through so no renderer has to re-derive the pseudonym /
     * anonymised distinction, which is a safety property and not a detail.
     */
    realName: a.realName ?? null,
    identityStatus: a.identityStatus ?? 'unverified',
    genre: a.genre ?? [],
    note: a.note ?? null,
    generation: gen?.id ?? null,
    generationLabel: gen?.label ?? null,
    /** 'sourced' vs 'asserted', so 4G/5G can be presented as framing. */
    generationBasis: gen?.basis ?? null,
    crews: crews
      .filter((c) => c.memberIds.includes(a.id) || (a.crewIds ?? []).includes(c.id))
      .map((c) => ({ id: c.id, name: c.name, kind: c.kind, role: 'member' })),
    /** The 2020s new wave is navigated by label, not crew. */
    labels: crews
      .filter((c) => c.kind === 'label' && (a.labelIds ?? []).includes(c.id))
      .map((c) => ({ id: c.id, name: c.name })),
    groups: outgoing(a.id)
      .filter((r) => r.type === 'member_of')
      .map((r) => ({ id: r.to, name: artistName(r.to), kind: get(r.to)?.kind ?? null })),
    releases: discography.map(artistCredits),
    songs: songs.filter((s) => s.artistId === a.id).map((s) => ({ id: s.id, title: s.title, year: s.year, note: s.note ?? null })),
    /** Periods this artist is placed in, so a profile can show its era. */
    periods: periods
      .filter((p) => (p.artistIds ?? []).includes(a.id) || (p.crewIds ?? []).some((cid) => crews.find((c) => c.id === cid)?.memberIds.includes(a.id)))
      .map((p) => ({ id: p.id, label: p.label, range: p.range })),
    events: events
      .filter((e) => e.performerIds.includes(a.id))
      .map((e) => ({ id: e.id, name: e.name, date: e.date, venue: get(e.venueId)?.name ?? null })),
    /**
     * Disputes this artist is a party to, with the claim and its status. Kept
     * on the profile so a reader sees the dispute and its evidence together -
     * a dispute without its corroboration note is exactly the thing the archive
     * exists to avoid.
     */
    disputes: disputes
      .filter((d) => (d.parties ?? []).includes(a.id))
      .map((d) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        statusNote: d.statusNote ?? null,
        period: d.period,
        target: d.targetDescription ?? null,
        claim: d.claim,
        response: d.response ?? null,
        corroboration: d.corroboration,
        safety: d.safety ?? null,
        sourceCount: d.sourceIds.length,
      })),
    /** True where the artist is named in a dispute but is not the accused party. */
    namedInDisputes: disputes
      .filter((d) => !(d.parties ?? []).includes(a.id) && (d.partyNames ?? []).includes(a.name))
      .map((d) => d.id),
    relations: outgoing(a.id).map((r) => ({ type: r.type, to: r.to, toLabel: get(r.to)?.name ?? r.to, status: r.status, confidence: r.confidence, note: r.note ?? null })),
    /**
     * Incoming edges. `REJECTED` edges are kept, not filtered, because a
     * rejected claim is a finding: this edge records that a widely-assumed
     * association is *not* supported. A renderer should show it as absent.
     */
    mentionedBy: incoming(a.id).map((r) => ({
      type: r.type,
      from: r.from,
      fromLabel: get(r.from)?.name ?? r.from,
      status: r.status,
      note: r.note ?? null,
    })),
    sources: a.sourceIds.map((id) => ({
      id,
      title: get(id)?.title ?? id,
      publication: get(id)?.publication ?? null,
      url: get(id)?.url ?? null,
      /** Read the archived copy when the live URL is dead. */
      readAt: get(id)?.archivedUrl ?? get(id)?.url ?? null,
      quality: get(id)?.quality ?? null,
    })),
  };
}

for (const c of crews) {
  const crewRels = [...outgoing(c.id), ...incoming(c.id)];
  detail[c.id] = {
    id: c.id,
    kind: c.kind === 'label' ? 'label' : 'crew',
    name: c.name,
    kindOfEntity: c.kind,
    formed: c.formed,
    dissolved: c.dissolved ?? null,
    city: c.city,
    status: c.status,
    note: c.note ?? null,
    generation: generationOf(c.id)?.id ?? null,
    generationLabel: generationOf(c.id)?.label ?? null,
    members: c.memberIds.map((id) => ({ id, name: artistName(id), type: get(id)?.type ?? null })),
    /**
     * Releases bearing this entity's name, by three routes: a label credit, a
     * crew compilation led by one of its members, and any release at all that
     * names one of its members. Crew mixtapes are the standard form in the
     * tape era, so a crew with no "releases" would badly understate its output.
     */
    releases: releases
      .filter(
        (r) =>
          r.labelId === c.id ||
          (c.kind !== 'label' &&
            [r.artistId, r.artistIdB].some((id) => id && c.memberIds.includes(id)) &&
            // Crew compilations and mixtapes are how crews shipped in the tape era,
            // so they count; a member's solo album does not.
            ['compilation', 'mixtape', 'collection'].includes(r.type)),
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        year: r.year,
        type: r.type,
        artist: artistName(r.artistId),
        via: r.labelId === c.id ? 'label' : 'crew',
        trackCount: r.trackCount ?? null,
      })),
    disputes: disputes
      .filter((d) => (d.parties ?? []).includes(c.id) || d.targetDescription?.includes(c.name))
      .map((d) => ({ id: d.id, type: d.type, status: d.status, period: d.period, target: d.targetDescription ?? null })),
    relations: crewRels.map((r) => ({
      type: r.type,
      from: r.from,
      to: r.to,
      status: r.status,
      confidence: r.confidence,
      note: r.note ?? null,
    })),
    sources: c.sourceIds.map((id) => ({
      id,
      title: get(id)?.title ?? id,
      publication: get(id)?.publication ?? null,
      url: get(id)?.url ?? null,
      readAt: get(id)?.archivedUrl ?? get(id)?.url ?? null,
      quality: get(id)?.quality ?? null,
    })),
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

/** An artist can carry several genres, so this flattens before tallying. */
const tallyMulti = (rows, key) =>
  rows.reduce((acc, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v === null || v === undefined || v === '') continue;
      acc[v] = (acc[v] ?? 0) + 1;
    }
    return acc;
  }, {});

/** Diaspora base, derived from the base field so it is never guessed at. */
const diasporaBase = artists.filter((a) => a.base && !/^Yangon|^Mandalay/.test(a.base));

const facets = {
  artistType: tally(artists, 'type'),
  artistCity: tally(artists, 'city'),
  /** Yangon-centred for most of the archive; the exceptions are the finding. */
  artistBase: tally(artists, 'base'),
  artistGenre: tallyMulti(artists, 'genre'),
  /**
   * identityStatus is the field to read before publishing any artist list.
   * 79 of 116 records have no published real name, and 12 of those are
   * deliberate pseudonyms or anonymised identities.
   */
  identityStatus: tally(artists, 'identityStatus'),
  /** Crews, labels, studios and media archives, by kind. */
  crewKind: tally(crews, 'kind'),
  /** Which city each crew belongs to - the underground was Mandalay-heavy. */
  crewCity: tally(crews, 'city'),
  generation: tally(artists, (a) => generationOf(a.id)?.id ?? null),
  releaseType: tally(releases, 'type'),
  /** Releases whose year is null are re-release conflicts, not missing data. */
  releasesWithoutYear: releases.filter((r) => r.year === null).length,
  sourceType: tally(sources, 'type'),
  sourceQuality: tally(sources, 'quality'),
  /** Sources cited only through an archived copy, because the original died. */
  sourcesArchivedOnly: sources.filter((s) => s.archivedUrl && s.archivedUrl !== s.url).length,
  disputeType: tally(disputes, 'type'),
  disputeStatus: tally(disputes, 'status'),
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

/**
 * An inventory of what the archive does NOT know, so a renderer can show the
 * gaps as gaps rather than implying completeness.
 */
const coverage = {
  artists: {
    total: artists.length,
    withRealName: artists.filter((a) => a.realName !== null).length,
    pseudonymous: artists.filter((a) => ['pseudonym', 'anonymised'].includes(a.identityStatus)).length,
    withCity: artists.filter((a) => a.city !== null).length,
    withGenre: artists.filter((a) => a.genre.length > 0).length,
    diasporaBase: diasporaBase.map((a) => ({ id: a.id, name: a.name, base: a.base })),
    activeFromUnknown: artists.filter((a) => a.activeFrom === null).length,
  },
  releases: {
    total: releases.length,
    byType: facets.releaseType,
    yearUnknown: facets.releasesWithoutYear,
    yearConflicted: releases.filter((r) => r.yearNote).length,
    byGeneration: Object.fromEntries(
      generations.map((g) => [g.id, g.releaseIds.length]).filter(([, n]) => n > 0),
    ),
  },
  periods: {
    total: periods.length,
    /** Acts a period names that have no entity record yet - the visible gaps. */
    unlinkedNames: resolvedPeriods.reduce((n, p) => n + p.unlinkedNames.length, 0),
  },
  generations: {
    sourced: generations.filter((g) => g.basis === 'sourced').map((g) => g.id),
    asserted: generations.filter((g) => g.basis === 'asserted').map((g) => g.id),
    artistsWithoutActiveFrom: unplacedInTime.map((a) => a.name),
  },
  sources: {
    total: sources.length,
    /** Sources that are a fan archive or aggregator rather than reporting. */
    archivalOrAggregated: sources.filter((s) => ['archive', 'blog'].includes(s.type)).map((s) => s.id),
  },
  disputes: {
    total: disputes.length,
    byStatus: facets.disputeStatus,
    /** Disputes resting on one source, or on a primary source that has since died. */
    singleSource: disputes.filter((d) => /single-source/i.test(d.corroboration)).map((d) => d.id),
    /** Parties named in a dispute but with no entity record. */
    unlinkedParties: disputes.flatMap((d) => d.partyNames ?? []),
  },
  cities: {
    /** Artist count by city. Mandalay matters more than this archive first showed. */
    byArtistCount: facets.sceneCities,
    mandalayArtists: artists.filter((a) => a.city && /mandalay/i.test(a.city)).map((a) => a.name),
    mandalayCrews: crews.filter((c) => c.city && /mandalay/i.test(c.city)).map((c) => c.name),
  },
};

/**
 * What the research found about how disputes actually work in this scene, so a
 * renderer does not have to rediscover it or - worse - assume a Western model.
 */
const disputePatterns = {
  beefIsNotBeef: {
    finding:
      'A systematic sweep of ~23,000 archived fan-catalogue URLs found that "beef" in Burmese hip hop is overwhelmingly a GENRE LABEL and a SONG TITLE, not a documented grievance. Every archived post whose slug contains "beef" is a multi-artist posse cut, and not one names a target. One is titled "Beef History" and is performed by four members of the same crew together.',
    implication:
      'Do not build a feud-view by matching on the word "beef". Use data/disputes.json, where a claim, a target and evidence exist.',
  },
  vsUsuallyMeansCollaboration: {
    finding:
      '"vs" overwhelmingly means a same-track collaboration or a battle recording rather than a feud. Verified examples: "Jouk Jack Vs. Kyaw Htut Swe" is a 7-track mixtape by two members of the same group; "J Ki Vs G Fatt" is a feature on a track about a lover\'s quarrel; "G Tone Vs ကက္က" is a remix.',
    implication: 'Treat a "vs" title as a credit fact, never as evidence of rivalry.',
  },
  dissIsRarelyNamed: {
    finding:
      '"diss" is nearly absent as a naming convention, which is the opposite of expectation: across 23,033 archived URLs only two contain it, and one of those is entirely produced and written by the artist\'s own crew. The scene absorbed the battle as a PERFORMANCE FORM rather than a named-feud genre - burying a diss in a cypher was the norm.',
    implication: 'A dispute with no diss track on the record is not a contradiction of the pattern here.',
  },
  hateIsAFalsePositive: {
    finding:
      '"hate" is the dominant keyword in these archives and is about 90% romantic. Slugs like "i-hate-u", "love-to-hate" and "keep-calm-coz-i-hate-u" are love songs. Any keyword classifier over this corpus will drown in them.',
  },
  theRealMarker: {
    finding:
      'The genuine Burmese marker for a public dispute is ရေးကောက်, used as a verb, and a second marker is တာဝန်မကျေခဲ့မှု ("not fulfilling one\'s duty") - which is how the Ah Boy departure from VIP was reported. The pattern to search for is a Latin-alphabet post title paired with a Burmese subtitle, e.g. "Doubt Battle (သံသယတိုက္ပြဲ)", glossed as "onslaught/criticism + big fight".',
  },
  pre2011TheTargetWasTheState: {
    finding:
      'Before 2011 the dispute was with the state, not between artists. Independent reporting describes the 2007-08 period as one in which artists were slandered, banned and arrested on stage for their lyrics; Acid\'s Beginning had 16 tracks of which the censor board passed 11; Zayar Thaw said "we made 16 songs, but the censorship board only passed 11".',
    implication: 'For the earliest era, legal/censorship records absorb what a Western archive would file as beefs.',
  },
  thePivot: {
    finding:
      'The one clean beef analogue in the archive is a deliberate transfer of the battle form onto the state. DICKCOUNCIL producer Ko Aye Win, a former battler, told Insight Myanmar in December 2021: "Before the coup I was a B-Boy, I liked to battle a lot. But not anymore... So I thought, how about we switch the arrow direction in Dickcouncil, to take on the military junta and Min Aung Hlaing or whoever, like every tyrant across the globe!"',
    disputeId: 'dsp-raj-battle-pivot-2021',
    implication: 'The target of the adversarial form migrated from other rappers to the regime. That migration is the pivot point of the whole dataset.',
  },
  veiledDiss: {
    finding:
      'Where a real personal dispute did surface, the mechanism was the veiled diss. Bobby Soxer\'s 2022 track is titled "No Right to Speak Without Naming Names" (နာမည်တပ်ပြီးပြောပိုင့်ခွင့်မရှိ) - the title itself announces the indirectness, and it deliberately does not name its target.',
    disputeId: 'dsp-bobby-hlwanpaing-2022',
  },
  creditDisputesAreAbsent: {
    finding:
      'A credit dispute here is usually not a quarrel between artists but an ABSENT LEGAL CATEGORY. Thar Si Thaw of the Myanmar Music Association testified to VOA in 2016 that "the existing laws cannot give the necessary protection". Phyo Layy writes invisibly as a lyricist for other artists with no public credit and no documented grievance. A specific investigation of credit disputes around 99 Symphony\'s INTERNATION and Phyo Layy found no dispute exists at all - he does not appear in that album\'s writer credits.',
    disputeId: 'dsp-copyright-absence',
  },
  selfPolicing: {
    finding:
      'The scene self-polices on two axes, both aimed at the industry rather than at rivals: underground against mainstream (artists going commercial were criticised as "selling out", with Sai Sai Kham Leng the named example), and authenticity-by-knowledge - Kyaw Htut Swe remarks that people who only know the music from sample CDs are not real participants.',
    implication: 'Neither axis is a documented feud between named individuals. Do not code them as disputes.',
  },
  corrections: [
    'The Y-Zet concert death of June 2017 is NOT a beef killing. The fight began with accidental elbowing while dancing at a free show, six years after the "Shwee Die" diss. Do not link them.',
    'There is no documented beef between Y-Zet and Oasix or Mg Moe Aung. Every source shows them as closest collaborators and duo album partners; the archive\'s earlier note implying one has been retracted. The documented diss runs outward, to Hlwan Paing.',
    'G-Tone\'s November 2007 sanction was a one-year ban by the Myanmar Music Association, not an arrest, and not 2008. Coconuts (2015) garbles it as a 2008 arrest.',
    'Rock$tar and VIP are ONE group with two names, not two groups. The archive previously carried them separately; the real event is Ah Boy\'s departure.',
    '"Pyaw San Par" and "ပြောစမ်းပါ" are the same Dec 2015 Oasix & Y-Zet album under two titles. "1992" is Oasix\'s birth year, not a release.',
    'Rappler\'s investigation of the Telegram doxing that led to Byu Har\'s arrest is dated 22 August 2023, not March 2025, and the arrest was May 2023.',
    'The Overflow Music Festival charges are ss. 505-A, 294 and 114 per the police statement, not 505(b).',
    'Frenzo is a production company owned by Sai Sai Kham Leng, not a collective.',
    'HEIN HTET ZAW, HOT and OT THE CROC are ONE artist, not two or three. And ဦးတိုက် is not his Burmese name: ဦး is the honorific "U", making it read as "U Toik", and no source uses it.',
  ],
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
      periods: periods.length,
      images: images.length,
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
        ui: 'Pre-assembled views: generations, periods, timeline, milestones, highlights, facets, coverage. Start here for layout work.',
        entities: 'Canonical records exactly as stored in data/*.json.',
        graph: 'Flat nodes/edges with human-readable labels on every endpoint. For force-directed or matrix network views.',
        entityDetail: 'Denormalized per-entity bundles: discography, labels, crews, songs, events, relations, resolved sources. Keyed by entity id.',
        schema: 'Field definitions and data rules from schema/schema.json.',
      },
      safety: [
        'Read entities.artists[].identityStatus before rendering any person. "pseudonym" and "anonymised" mean the identity is deliberately withheld - by the artist, or because publication would endanger them. Do not attempt to resolve one, do not merge two records to "fix" a near-match, and do not pair a pseudonym with a real name inferred from a producer credit, a shared surname or a common collaborator.',
        'Some artists in this dataset are deceased, imprisoned, or executed. Phyo Zeya Thaw was executed on 25 July 2022; Byu Har is serving a 20-year sentence from August 2023; Lil Cado is deceased. Their records carry only what press has published. Do not add family or biographical detail beyond the cited sources.',
        'Several post-coup releases and events were documented under conditions of surveillance and risk. A Telegram or Facebook channel that carried music may also be the channel that doxed someone. Do not characterise any platform as safe.',
        'event "ev-raj-dickcouncil-party-2021" and the DICKCOUNCIL release were produced during a national internet shutdown. Distribution events in this period are evidence of circumstance, not just of promotion.',
      ],
      renderingHints: [
        'entities.artists and ui.generations are the primary navigation: group by generation, or by city (mostly Yangon, with Mandalay central to the fourth generation).',
        'ui.generations[] each carry a `basis` field. 1-3 are `sourced` (the citations enumerate them). 4 and 5 are `asserted`: artist- and press-asserted framing, not a sourced taxonomy. Style them differently and never merge them with 1-3 without a visible qualifier.',
        'ui.periods is the coarser editorial spine (c. 1994-2026) and is NOT the same axis as ui.generations. Periods reach past 2010; generations stop at "present" in the 3G label. Keep them distinct in the UI.',
        'ui.periods[].unlinkedNames lists acts the sources name that have no entity record yet. Render them with a qualifier, never silently drop them.',
        'ui.timeline is pre-sorted by year; render as a vertical or horizontal chronology.',
        'entityDetail["acid"] and entityDetail["sai-sai-kham-leng"] are the two deepest profiles and make good hero/detail pages.',
        'graph.edges[].status and .confidence let you dim unverified links without extra lookups.',
        'ui.facets.activeByYear is a ready-made activity series for a chart.',
        'Sort any people-facing list by year; id slugs are for keys only, never for display.',
        'Burmese-script aliases live in entities.artists[].aliases - keep them, do not transliterate.',
        'READ entities.artists[].identityStatus BEFORE building a people-facing list. Most records have no published real name, and post-coup acts are often deliberate pseudonyms. Do not attempt to resolve a pseudonym, and never pair one with a guessed name.',
        'ui.coverage is an explicit inventory of gaps: real-name coverage, unknown activeFrom years, unlinked period names, and which generation buckets are asserted rather than sourced. Use it to show what is missing instead of implying completeness.',
        'ui.facets.releasesWithoutYear and releases[].yearNote record re-release conflicts (e.g. Bo Htet\'s Heavy Weight, 2020 vs 2023). Show both dates; do not silently pick one.',
        'The 2020s new wave is organised by LABEL, not crew or city. Navigate it via crews where kind is "label" and via artists[].labelIds. Presenting it as a crew scene would misrepresent its structure.',
        'Diaspora is thin and real: ui.facets.artistBase and ui.coverage.artists.diasporaBase list every act with a non-Myanmar base. Seven of the nine countries checked have no documented rap scene at all - that absence is a finding, not an oversight.',
      ],
      keyArtists: [
        'acid', 'sai-sai-kham-leng', 'phyo-zeya-thaw', 'yan-yan-chan', 'annaga', 'hein-zaw',
        'nay-win', 'myo-kyawt-myaing',
        'oasix', 'yzet', 'htet-yan', 'x-boxin', 'zay-ye', 'yung-hugo',
        'rap-against-junta', 'lil-kee-boi', '223', 'reload', 'myat-amara-maung',
      ],
      keyReleases: [
        'rel-beginning', 'rel-chocolate-yaung-yayge', 'rel-thangegyin-myar-swar',
        'rel-february-mhat-tann', 'rel-date-date-kye',
        'rel-oasix-first', 'rel-oasix-running', 'rel-pyaw-san-par', 'rel-oasix-1992',
        'rel-htetyan-shae', 'rel-xboxin-99', 'rel-zay-ye-respect', 'rel-99sym-internation',
        'rel-raj-dickcouncil', 'rel-zayarthaw-faith', 'rel-223-daworld', 'rel-ahsar-free',
        'rel-bkho-bluonblue', 'rel-lilkee-boi-motherteresa',
      ],
      keyEvents: [
        'ev-saisai-birthday-show', 'ev-straight-outta-yangon-2',
        'ev-jamit-first-2012', 'ev-first-step-2016', 'ev-yzet-violent-2017',
        'ev-showdown-freestyle', 'ev-break-the-night-2019',
        'ev-raj-firstshow-2021', 'ev-raj-dickcouncil-party-2021', 'ev-overflow-2025',
        'ev-mob-party-2024', 'ev-mob-party-2025',
      ],
      /**
       * Entities the sources treat as load-bearing, for a renderer picking
       * hero subjects. `identityStatus` is included so a picker can avoid
       * surfacing a pseudonym by accident.
       */
      keyEntities: [
        ...['acid', 'phyo-zeya-thaw', 'oasix', 'yzet', 'yung-hugo', 'rap-against-junta', 'lil-kee-boi', '223', 'byu-har', 'kan-kyi'].map((id) => {
          const a = get(id);
          return a ? { id, name: a.name, kind: a.kind, identityStatus: a.identityStatus } : { id };
        }),
      ],
    },
  },

  ui: {
    headline: 'Myanmar Hip-Hop: a sourced timeline of Yangon rap',
    summary:
      'From the first album in 2000 to a 2017 reunion show, this is an open, source-attributed archive of Myanmar hip-hop. Every fact links back to a citation, and every citation is marked verified, medium or low confidence.',
    /** Front-matter for a renderer: status, research cut, positioning, method, limits. */
    editorial,
    /**
     * The editorial navigation spine (five periods, c. 1994-2026), with images
     * and citations already resolved. `ui.generations` is the separate
     * source-attributed generation taxonomy - do not merge the two axes.
     */
    periods: resolvedPeriods,
    images,
    /**
     * The generation buckets, with a `basis` field: `sourced` where the
     * citations enumerate the generation, `asserted` where the label is
     * artist- or press-asserted only. 4 and 5 are asserted. Do not render
     * them as though they were the same kind of fact as 1-3.
     */
    generations,
    /** An explicit inventory of what the dataset does not know. */
    coverage,
    /**
     * How disputes actually work in this scene. Read this before building any
     * conflict view - the Western "beef" model does not fit, and a naive
     * keyword match over the fan archives produces mostly false positives.
     */
    disputePatterns,
    /**
     * A year-by-year chronology, pre-sorted. This is the one section most
     * consumers reach for first, so it is guaranteed present rather than left
     * to a renderer to derive from release and event dates - doing that would
     * mean re-implementing the null-year and conflicted-year rules in every
     * client, and getting them subtly different each time.
     */
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
    /**
     * Disputes are also emitted at the top level, because they are neither
     * entities nor a UI view - they are claims. See the note on `disputes`.
     * Periods, images and editorial stay under `ui` only: they are editorial
     * framing, not canonical records, and duplicating them here would invite a
     * consumer to read two copies as two truths.
     */
    disputes,
  },

  graph: { nodes, edges, disputeEdges },

  /**
   * Beefs, disputes, arrests, bans and credit conflicts as first-class data.
   *
   * This section exists because "beef" turns out to be the wrong mental model
   * for this scene. A systematic sweep of ~23,000 archived fan-catalogue URLs
   * found that "beef" in Burmese hip hop is overwhelmingly a GENRE LABEL and a
   * SONG TITLE, not a documented grievance: every archived post whose slug
   * contains "beef" is a multi-artist posse cut, and none names a target. Likewise
   * "vs" usually means a same-track collaboration rather than a feud, and "diss"
   * is nearly absent as a naming convention.
   *
   * What is real is elsewhere: veiled personal diss tracks, crew exits,
   * censorship and arrests. And the single cleanest case is RAJ's deliberate
   * pivot of the battle form away from other rappers and onto the junta.
   *
   * `meta.guide.renderingHints` and ui.disputePatterns carry the full finding.
   */
  disputes: disputes.map((d) => ({
    ...d,
    resolvedParties: (d.parties ?? []).map((id) => ({
      id,
      name: get(id)?.name ?? id,
      kind: get(id)?.kind ?? null,
    })),
    sources: d.sourceIds.map((id) => ({
      id,
      title: get(id)?.title ?? id,
      publication: get(id)?.publication ?? null,
      url: get(id)?.url ?? null,
      readAt: get(id)?.archivedUrl ?? get(id)?.url ?? null,
      quality: get(id)?.quality ?? null,
    })),
  })),

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
