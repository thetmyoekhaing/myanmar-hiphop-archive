# Myanmar Hip-Hop Open Data Archive (v0.3.0 — Mandalay, Disputes & New Wave)

An open, source-attributed dataset of Myanmar/Burmese hip-hop history: artists, crews and labels, releases, songs, events, venues, sources, and relationship edges.

Covers the 1988 precursors through to 2026: the underground tape era that no
streaming platform has catalogued, both Yangon and Mandalay, the disputes,
arrests and bans that shaped the scene, and the 2020s new wave.

## Contents

```
data/
  artists.json/.csv        144 artist, group, duo and collective records
  crews.json/.csv          36 crews, labels, studios, media archives and associations
  releases.json/.csv       122 releases (albums, EPs, mixtapes, compilations, singles, live)
  songs.json/.csv          32 tracks
  events.json/.csv         26 events (shows, battles, sentencing, arrests)
  venues.json/.csv         15 venues (Yangon, Mandalay, Chiang Mai)
  sources.json/.csv        128 bibliographic source records, each with a `quality` label
  relationships.json/.csv  122 typed, sourced edges
  disputes.json/.csv       17 beefs, crew exits, arrests, bans and credit conflicts
  topics.json/.csv         Genre/topic nodes
  periods.json             5 editorial navigation periods (c. 1994-2026)
  images.json              Image credit records (metadata only, no binaries)
  editorial.json           Status, research cut, positioning, method, limitations
schema/schema.json         Field definitions and data rules
scripts/build.mjs          Merges data/ into one AI/UI-ready payload
dist/myanmar-hiphop.json   Generated single-file payload (do not hand-edit)
README.md                  This file
LICENSE.txt                Data license
```

`data/` is the single source of truth. Consumers such as
`myanmar-hiphop-archive/` read the generated payload and keep no data of
their own — see [Single source of truth](#single-source-of-truth) below.

## Single-file build

`dist/myanmar-hiphop.json` is the whole dataset in one document, built from `data/`:

```
node scripts/build.mjs
```

Sections, in the order a UI generator should read them:

| Section | Contents |
| --- | --- |
| `meta` | Counts, licence, provenance rules, `meta.guide` (rendering hints) |
| `ui` | `editorial`, `periods`, `generations`, `images`, `timeline`, `milestones`, `highlights`, `facets`, `coverage`, `disputePatterns` — pre-assembled, no id-joining needed |
| `disputes` | Claims with their evidence: type, parties, claim, response, corroboration, status, safety |
| `entities` | Canonical records, exactly as stored in `data/*.json` |
| `graph` | Flat `nodes`/`edges` with labels resolved on both endpoints |
| `entityDetail` | Denormalized bundle per entity: discography, labels, crews, songs, events, periods, disputes, relations, resolved sources |
| `graph` | `nodes`/`edges` for collaboration views, plus `disputeEdges` kept separate |
| `schema` | Field definitions and data rules |

The build validates every cross-reference and aborts on a dangling id, so a
generated payload is always internally consistent. `M.H.A.` lives in `crews.json`
only, not in `artists.json`. It also refuses a `artistIds` entry that points at a
crew, and a `period.imageId` that does not exist.

## Two navigation axes, not one

`ui.generations` and `ui.periods` are **different taxonomies** and must not be
conflated in a renderer:

| | `ui.generations` | `ui.periods` |
| --- | --- | --- |
| Basis | the generation labels the sources themselves use | editorial, for navigation |
| Span | Precursors → present | c. 1994 → 2026 |
| Buckets | 6 | 5 |
| Sourced from | `src-wiki-burmese-hiphop` and related | the per-period `sourceIds` |

`ui.periods` carries the parts of the history the dataset is thinnest on
(2011–2026), which is why it exists alongside the generation buckets rather
than replacing them.

## Generations, and which ones are actually sourced

Every generation bucket carries a **`basis`** field. This is the single most
important thing to know before rendering the archive:

| Bucket | `basis` | What it rests on |
| --- | --- | --- |
| Precursors, 1st, 2nd, 3rd | `sourced` | The sources enumerate them. |
| **4th generation** | **`asserted`** | Yung Hugo telling HipHopDX in March 2022 *"I'm fourth-generation"*, plus MYANMORE's 2018 *"a new hip hop generation has arrived"*. |
| **New wave** | **`asserted`** | The archive's own grouping of a label-network cohort, from copyright structure and LIFTED's 2023 scene report. |

**The Burmese hip-hop Wikipedia article covers only three generations and cannot
support a fourth.** No cited source enumerates a 4th or 5th cohort. So:

- Do not present 4th or New wave in the same voice as 1st–3rd.
- Do not state a 4G/5G boundary date. The New wave bucket starts at 2018, which
  overlaps the fourth generation, because nothing dates the shift.
- If you find a source that enumerates these generations, promote `basis` to
  `sourced` in `scripts/build.mjs` and cite it. The `caveat` field on each
  asserted bucket is written to be replaced.

Wikipedia calling Ah Boy a *"pioneer of the third generation"* implies a fourth
is a recognised category, but does not list one.

## The underground tape era

The 2008–2016 cassette/VCD/mixtape ecosystem is the best-documented decade in
this archive and entirely absent from streaming platforms. It is carried by
`crews.json` and the fan archives that catalogued it:

| Crew | City | What it produced |
| --- | --- | --- |
| Wildboy (Wildboyz Entertainment) | Mandalay | **Oasix**, Y-Zet — the clearest documented underground→mainstream pipeline |
| B-Clipz (B Clipz Recordz) | Yangon | Founded Aug 2008, 9 members, never released an album |
| M.R.C (Nine Win) | Yangon | 15-name roster, MRC Music Production |
| Y.H.S | Yangon | Recording studio, not a rap group |
| B-Lord Family (BLF) | Yangon | X-Boxin, Ba Chit |
| Rock$tar | Yangon | Ah Boy, from 2002 |
| Jam It! | Yangon + Mandalay | The best-documented underground live platform, 20+ gigs by 2015 |

**These releases exist only in fan archives.** `mmhiphopchannel.com`,
`mmhiphopug.blogspot.com`, `myanmarmp3album.com` and `myanmarhiphopalbums.net`
are all dead or hijacked and are cited through `web.archive.org` only. The
highest-value remaining work is a systematic crawl of the ~23,000 archived
`mmhiphopchannel.com` URLs plus the 2008–2011 `myanmarmp3album.com` index.

Note that MHC also reposted foreign albums, so bulk ingestion needs a
Myanmar-linkage filter. This dataset is hand-curated and contains only verified
Burmese-linked records.

## The 2020s new wave is organised by label, not crew

The most reliable structural finding in the archive: the 2020s cohort resolves
into a **copyright-label network** rather than a crew or city scene.

- **Billionaire Minds Group (BMG)** — dominant across the 2023–2026 cohort
- **Eagle Element** — Lil Kee Boi (founder), Ah Sar
- **b4 Records** — Wink, bkho bain
- The NOISE Records, BOOMBOX Ent, Legacy Music, Fastlane, Zen Music, Destino

Navigate it with `crews.json` where `kind` is `label`, and with
`artists[].labelIds` / `entityDetail[].labels`. Roster membership is inferred
from `(P)` copyright strings, not from published rosters, and is rated
`AI_EXTRACTED` accordingly.

## Mandalay

The archive was long Yangon-centric because that is what the English-language
press covered. Mandalay is where the tape scene actually happened, and it is
now represented properly:

| Entity | What it is |
| --- | --- |
| **Wildboy (Wildboyz Entertainment)** | Mandalay's principal underground crew. Produced **Oasix** and **Y-Zet**; released a 12-track mixtape in Feb 2013. 19-member roster recovered from two independent fan-archive mirrors. |
| **Hein Htet Zaw** | Rapper from north Mandalay, rapping from 2013, producing from 2016. **Three names, one person: he is also `HOT` and `OT the Croc`.** |
| **Khaing Myal Kyaw Swar** | b. 1997, Nan Taw Shae. Rapper-producer, later with 360 Beatz. |
| **Mandalay Rapperz Crew (MRC)** | Self-labelled crew from 2011, studio TKG. **Distinct from the Yangon `M.R.C` (Nine Win) that shares its initials** — the two are kept separate. |
| **Error MDY** | Mandalay collective, 9 members, 14-track mixtape Aug 2013. |
| **Thar Nge (MC Family)** | The strongest Mandalay-scene evidence in the archive: two of Oasix's and Y-Zet's seven guest appearances on its 2013 mixtape, from the crew they both belonged to. |
| **Studio Mandalay**, **WCC**, **MDY All Stars** | Studio, affiliation tag, and a 2012 six-artist compilation. |
| **Wareru** | Singer-rapper with a 2011–2017 hip-hop catalogue. **City UNVERIFIED** — an earlier note placed him in Mandalay and that is not supported. |

`ui.coverage.cities` lists every Mandalay artist and crew.

Note that `hot` is an extremely common token in the archived fan catalogue: all
37 `hot` hits in that corpus are false positives. Do not keyword-match on it.

## Disputes, and why "beef" is the wrong word

`data/disputes.json` holds 17 records: 10 legal/censorship, 3 diss tracks, and
a crew exit, a credit dispute, and two others. Each carries a `claim`, a
`response`, a `corroboration` statement, and a `status` of `settled`,
`disputed`, `unresolved` or `structurally unresolved`.

**A systematic sweep of ~23,000 archived fan-catalogue URLs found that "beef"
in Burmese hip hop is overwhelmingly a genre label and a song title, not a
documented grievance.** Every archived post whose slug contains "beef" is a
multi-artist posse cut, and none names a target. One is titled *Beef History*
and is performed by four members of the same crew together. A renderer that
builds a feud view by keyword-matching "beef" will produce nonsense.

Other findings the archive records, in `ui.disputePatterns`:

- **"vs" usually means collaboration.** "Jouk Jack Vs. Kyaw Htut Swe" is a
  7-track mixtape by two members of the *same* group. "J Ki Vs G Fatt" is a
  feature on a track about a lover's quarrel.
- **"diss" is almost absent as a naming convention** — the opposite of
  expectation. The scene absorbed the battle as a performance form; burying a
  diss in a cypher was the norm.
- **"hate" is ~90% romantic** in these archives. Any classifier drowns in it.
- **The real Burmese marker is ရေးကောက်** (to write a diss), appearing as a verb.
  The pattern to search for is a Latin post title paired with a Burmese
  subtitle, e.g. *"Doubt Battle (သံသယတိုက္ပြဲ)"*.
- **Before 2011 the target was the state, not another artist** — artists were
  slandered, banned and arrested on stage for their lyrics.
- **The pivot:** DICKCOUNCIL producer Ko Aye Win, a former battler, told
  Insight Myanmar he deliberately turned the battle form "to take on the
  military junta and Min Aung Hlaing or whoever, like every tyrant across the
  globe". The target of the adversarial form migrated, and that migration is
  the pivot point of the whole dataset.
- **A credit dispute here is an absent legal category, not a quarrel.** The
  Myanmar Music Association testified in 2016 that "the existing laws cannot give
  the necessary protection". Phyo Layy writes invisibly for other artists with
  no public credit and no grievance.

Dispute edges are kept in `graph.disputeEdges`, separate from `graph.edges`.
A beef is a *claim* with an evidentiary status, not a fact about two artists,
and merging them into one graph would be a lie about the data.

## Safety: identity is a field, not a footnote

**Read `identityStatus` before building any people-facing list.** 104 of 115
records have no published real name. 13 are marked `pseudonym` or `anonymised`,
meaning the identity is deliberately withheld — by the artist, or because
publication would endanger them. VICE states outright that at least one alias was
adopted to protect its user from the military.

Recorded in the archive:

- **Phyo Zeya Thaw** — executed 25 July 2022; his unfinished *"Generation Driven
  by Faith"* was released posthumously by Rap Against Junta
- **Byu Har** — sentenced to 20 years in August 2023
- **Lil Cado** (223) — deceased by December 2025

Do not attempt to resolve a pseudonym. Do not merge two records to "fix" a
near-match — `GRACEe`/`Grace` and `Yair Yint Aung` are kept separate precisely
because the platforms keep them separate. Do not pair a pseudonym with a real
name inferred from a producer credit, a shared surname, or a common
collaborator. `NAY` has two competing real-name candidates in platform credits
and may be two people; it is not resolved.

## Periods and images

`data/periods.json` is the editorial spine. Each period resolves to:

- `artistIds` / `crewIds` — records that exist, validated by the build
- `names` — a flat list of everything above plus `artistNames`, ready to render
- `unlinkedNames` — acts the cited sources name that have **no** entity record
  yet (Y.A.K., Ko Minn, 9KT, …). These are a deliberate, visible gap, not an
  omission: they are not promoted to `artists.json` until an act-level source
  supports a record. 26 remain.
- `sources` — resolved citations, so a period panel needs no extra fetching

`data/images.json` holds credits and source links only; **no image binaries are
redistributed here**. Alt text and credit live on the *period*, not just the
asset, because one image file is captioned differently in different periods.

`data/editorial.json` holds front-matter for renderers: `status`, `asOf`,
`positioning`, `methodNote` and the `limitations` list. Read the limitations
before publishing — they record the research gaps, the AI aggregators to avoid,
and the contested identities.

## Conflicts are preserved, not harmonised

Where sources disagree, the dataset keeps both values and says why. The build
exposes this through `ui.coverage` and per-record `yearNote` / `note` fields.

| Record | The disagreement |
| --- | --- |
| `rel-raj-dickcouncil` | 12 tracks per Bandcamp and HipHopDX; "11 songs by 15 rappers" per RAJ's own statement. |
| `rel-bo-htet-heavy` | 2020 fan upload and promo show vs. 2023 platform release. Year is `null` with both dates in `yearNote`. |
| `rel-yunghugo-mkga` | Announced July 2022, released 28 Feb 2023. |
| `rel-pyaw-san-par` | Wikipedia titles it "Pyaw San Par", the fan archive "ပြောစမ်းပါ" — **one release, two titles.** "1992" is Oasix's birth year, not a release. |
| `dsp-shwee-die` | The "beefing" framing rests on one Burmese page that is now dead and has no Wayback capture. A Korean mirror renders the verb as "strengthened". |
| `dsp-g-tone-2007` | The tattoo is a back tattoo of clasped praying hands (DVB) or rosary beads on a wrist (de Bakker). |
| `dsp-9mm-name-ban` | Wikipedia gives two mutually inconsistent reasons for the same ban. |
| `dsp-yan-yan-chan-2008` | Press reported the arrest as democracy-related; the junta claimed drug charges. Wikipedia flags the latter `[citation needed]`. Neither is established. |
| `rel-yzet-za-2017-fix` | Wikipedia glosses ဇ as "Gene"; ဇ is the Burmese letter *za*. |
| `hein-htet-zaw` | Six albums/EPs with **no year in any source**. Year is `null` on all six. |
| GRACEe / Grace | Two platform artist entities with overlapping personnel. Not merged. |
| `yair-yint-aung` | Two platform artist ids, so part of the catalogue sits on a split page. |
| Rap Against Junta | Press names a founder; the collective insists there is none ("We are all leaders"). |
| `b4-records` | **No source could be found for this label at all.** Possibly a garbling of Lil Kee Boi's `##B4KTBC` EP. Flagged unverified. |
| `vc-triple-edge` vs `triple-edge-cm` | The platform group is not established to be the Chiang Mai group. Kept separate. |

### Corrections made while researching

Research in this pass overturned several things the archive previously stated.
They are listed in `ui.disputePatterns.corrections` and in
`data/disputes.json`:

- **There is no beef between Y-Zet and Oasix or Mg Moe Aung.** Every source
  shows them as closest collaborators and duo album partners. An earlier note
  implying one has been retracted. The documented diss runs *outward*, to
  Hlwan Paing's "Done Pyan".
- **The Y-Zet concert death is not a beef killing.** The fight began with
  accidental elbowing while dancing at a free show, six years after the track.
- **G-Tone's 2007 sanction was a ban, not an arrest** — and not 2008.
- **Rock$tar and VIP are one group with two names.** The archive previously
  carried them as two crews; the real event is Ah Boy's departure.
- **Rappler's Telegram-doxing investigation is dated August 2023**, not March
  2025, and the arrest was May 2023.
- **The Overflow Festival charges are ss. 505-A, 294 and 114** per the police
  statement, not 505(b).
- **Frenzo is a production company owned by Sai Sai Kham Leng**, not a
  collective.
- **HEIN HTET ZAW, HOT and OT THE CROC are one artist.** And ဦးတိုက် is not his
  Burmese name: ဦး is the honorific "U", so it reads "U Toik", and no source uses it.

## What the dataset does not know

`ui.coverage` is an explicit inventory, built so a renderer can show gaps as gaps:

- 131 of 144 artists have no published real name; 13 are pseudonymous
- 73 artists have no verified start year
- 26 acts named in period sources still have no entity record
- Releases with no year at all, including **six Hein Htet Zaw albums** whose
  platforms record no dates; 3 more with a conflicted year
- Sources cited only through an archived copy, because the original died, because the original died
  (HipHopDX is shut down; four fan-archive domains are dead or hijacked)
- 4 of 6 generation buckets are `sourced`; 2 are `asserted`

**Burmese-language research is the largest remaining gap.** The strongest
material for the tape era and the post-coup scene is Burmese-language, and
search tooling could not run Burmese queries productively here. Much of what
*was* gathered came from crawling known domains and the Wayback CDX index.

## Single source of truth

`data/` is authoritative. `dist/myanmar-hiphop.json` is generated, and every
consumer reads it rather than keeping a copy:

```
node scripts/build.mjs                  # or: cd myanmar-hiphop-archive && npm run data
```

`myanmar-hiphop-archive/` imports the payload through the `@archive` alias
(`vite.config.js`) and holds no data files. Its `predev` / `prebuild` hooks
rebuild the payload first, so a stale copy cannot survive a run.

**If you are adding a fact, add it to `data/`.** Never to a consumer, and never
to `dist/`.

## Key facts captured (high confidence)

- **Acid** (Yangon), founded by Phyo Zeya Thaw, Annaga, Hein Zaw and Yan Yan Chan, released Burma's first hip-hop album **Beginning (Sa-Tin-Gyin)** in **2000**; it topped the Burmese charts for over two months.
- **Sai Sai Kham Leng** debuted in 2000 with *Chocolate Yaung Yayge Einmet*; his 2001 follow-up *Thangegyin Myar Swar* made him a star; annual *Sai Sai Birthday Show* since 10 April 2004.
- Generational structure (per Wikipedia's *Burmese hip-hop* article): 1st gen (Acid, Theory, NS, Too Big), 2nd gen (9mm, Project-1, Byauk-Oh, Examplz, G-Family, On-Track, L.E.E, Cyclone, M.H.A., J-Me, Bigg-Y, G-Tone...), 3rd gen since late 2006 (Jouk Jack, Kyaw Htut Swe, VIP/Rock$tar, Hlwan Paing). That article stops at three generations.
- **Oasix** (b. Thet Ko Tun, 1992, Mandalay) came out of the Wildboy crew and released a duet album with **Y-Zet** on 24 Dec 2015; his solo album *1992* followed in Dec 2018. His own biography titles his 2009–2013 phase "Career beginnings in underground".
- **Hein Htet Zaw** (a.k.a. **HOT**, **OT the Croc**) rapped in north Mandalay from 2013 and produced from 2016, described as one of the most productive beat producers from "Area 952".
- **Htet Yan** and Thar Thar's *"Nway Thwar Tal"* (2018) went viral on TikTok in early 2019 with 50,000+ user videos — the clearest documented case of a short-form-video breakout carrying a Burmese underground act mainstream.
- **Rap Against Junta** formed from street concerts after the 1 Feb 2021 coup and released *DICKCOUNCIL* in October 2021, compiled over three months during a national internet shutdown and launched by YouTube listening party.
- **Lil Kee Boi** came up in Bago and is based in Munich; *"Mother Teresa"* with NAY is the breakout of that diaspora strand.
- **Byu Har**, described by the BBC as one of Myanmar's biggest hip-hop artists, was sentenced to 20 years in August 2023 after a Facebook Live criticising power cuts. Rappler's investigation documents the pro-military Telegram doxing that preceded the arrest.
- **G Fatt** was one of 20 people the State Administration Council issued s.505(a) warrants against in April 2021.

## Provenance model

Every record and relationship carries `sourceIds` / `source` pointing to `sources.json`, plus:
- `status`: `VERIFIED` (human-checked), `AI_EXTRACTED` (pending review), `CONFLICTED`, `REJECTED`
- `confidence`: high / medium / low

Rules the build enforces and the schema records:

- **AI-generated music-analytics aggregators are never cited.** musicmetricsvault,
  sounddrain and viberate publish fabricated prose and invented listener figures.
  Viberate's bio claims Lil Kee Boi is from South Korea; he is from Bago and
  based in Munich, and his own YouTube channel metadata is the likely source of
  the error. Pirate MP3 scrapers are lead generators only — every fact from one
  was re-verified against Apple Music, Spotify or Shazam first.
- **A platform genre field is not a stylistic claim.** Adjustor is tagged Pop;
  one Mossberg Arki track is tagged Folk. Genre is recorded only where a cited
  source states it.
- **A dead URL is not grounds for dropping a fact.** `archivedUrl` carries the
  readable copy, and `entityDetail[].sources[].readAt` prefers it.
- **Generic names need a platform id.** 28, SLAMM, blazy, Wink, Peachy and TOXIC
  all have unrelated same-name artists; the numeric id is in the source record.

## Copyright & scope

Factual metadata only (names, dates, places). No article text, lyrics, or images are redistributed. Copyrighted sources (The Street magazine scans, Myanmore, Insight Myanmar, Coconuts) are cited for facts only under scholarly citation.

## Status

Seed release plus the underground tape era, the fourth generation and the
2020s new wave. Editorial research cut **1 October 2026**.

Next phases, in rough value order:

1. **Crawl the archived fan archives** — ~23,000 `mmhiphopchannel.com` URLs plus
   the 2008–2011 `myanmarmp3album.com` index, with a Myanmar-linkage filter.
   Likely several hundred dated releases with tracklists no platform has.
2. **Burmese-language research** — the largest single gap, and likely to change
   the dataset more than any other step.
3. **Diaspora** — of nine countries checked, only Thailand/Chiang Mai has a
   documented scene and it is documented by one outlet. Seven have nothing.
4. OCR of *The Street* scanned issues, MMDB/MusicBrainz cross-checks.
5. Resolve the contested identities in `ui.coverage` — as act-level sources
   arrive, not by inference.

## Sources

See `data/sources.json` for all 94 full bibliographic records, each carrying a
`quality` label (`primary` / `high` / `medium-high` / `low` / `secondary`) that
describes the source's **role**, not whether a claim is true.

- **Encyclopedia:** Wikipedia — *Burmese hip-hop*, *Acid*, *Sai Sai Kham Leng*,
  *Oasix*, *Y-Zet*, *Ah Boy*, *J-Me*, *Nay Win*, *Htet Yan*, *Bobby Soxer*,
  *Sophia Everest*, *G Fatt*, *Phyo Zeya Thaw*, *Byu Har*
- **Interviews:** MYANMORE's *Rangoon Rhythm* series (Floke Rose 2019, Jimmy
  Jacobs 2018), Nay Win on Snare (2017), J-Me (2015), Yangon's underground scene
  (2015), IDEA Magazine on Y-Zet (2017), HipHopDX on Yung Hugo (2022), Insight
  Myanmar Ep.604 and its RAJ interview (2021), Eleven Media on Phyo Lay
- **Press:** Coconuts Yangon (including the Y-Zet concert death), Guardian,
  GlobalPost/AFP, BBC (2012 and 2023), The Independent, SCMP, SDUT, Mizzima, VOA,
  AP, RFA, PEN America, Rappler, Coda Story, Global Voices, Irrawaddy, NYT (2022),
  **VICE (2023, the single best RAJ source)**, **DVB** (MOB Party 2024/2025, the
  G-Tone 2007 ban, and Burmese rap coverage since 2007), **LIFTED Japan**,
  Eleven Media (the 2025 Overflow arrests and a 2025 Mandalay DJ prosecution),
  Global New Light of Myanmar, Reuters, Myanmar Internet Project, DW documentary
  (2026), WIRED and Guardian on the 2021 internet shutdown
- **Scholarly:** *Index on Censorship* "Rocking Rangoon"; Amnesty International
- **Primary artefacts:** Rap Against Junta's Bandcamp and YouTube, DICKCOUNCIL,
  360Beatz, Legacy Music, Jam It!, *The Street* magazine scans
- **Fan archives** (cited for release metadata only, via Wayback):
  Myanmar Hip Hop Channel, the Myanmar Hip Hop Underground blog,
  myanmarmp3album.com, myanmarhiphopalbums.net
- **Platform metadata:** Apple Music and Spotify artist pages, each carrying the
  numeric artist id needed to disambiguate name collisions
