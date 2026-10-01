# Myanmar Hip-Hop Open Data Archive (v0.1.0 — Seed Release)

An open, source-attributed dataset of Myanmar/Burmese hip-hop history: artists, crews, releases, songs, events, venues, sources, and relationship edges.

## Contents

```
data/
  artists.json/.csv        36 artist & group records ( Acid, Snare, Sai Sai Kham Leng, ... )
  crews.json/.csv          Crews/associations (M.H.A., Generation Wave)
  releases.json/.csv       10 releases (albums)
  songs.json/.csv          Known tracks
  events.json/.csv         Events (Straight Outta Yangon Ch.2, Sai Sai Birthday Show)
  venues.json/.csv         Venues
  sources.json/.csv        9 bibliographic source records
  relationships.json/.csv  33 typed, sourced edges
  topics.json/.csv         Genre/topic nodes
schema/schema.json         Field definitions and data rules
scripts/build.mjs          Merges data/ into one AI/UI-ready payload
dist/myanmar-hiphop.json   Generated single-file payload (do not hand-edit)
README.md                  This file
LICENSE.txt                Data license
```

## Single-file build

`dist/myanmar-hiphop.json` is the whole dataset in one document, built from `data/`:

```
node scripts/build.mjs
```

Sections, in the order a UI generator should read them:

| Section | Contents |
| --- | --- |
| `meta` | Counts, licence, provenance rules, `meta.guide` (rendering hints) |
| `ui` | `generations`, `timeline`, `milestones`, `highlights`, `facets` — pre-assembled, no id-joining needed |
| `entities` | Canonical records, exactly as stored in `data/*.json` |
| `graph` | Flat `nodes`/`edges` with labels resolved on both endpoints |
| `entityDetail` | Denormalized bundle per entity: discography, crews, songs, events, relations, resolved sources |
| `schema` | Field definitions and data rules |

The build validates every cross-reference and aborts on a dangling id, so a
generated payload is always internally consistent. `M.H.A.` lives in `crews.json`
only, not in `artists.json`.

## Key facts captured (high confidence)

- **Acid** (Yangon), founded by Phyo Zeya Thaw, Annaga, Hein Zaw and Yan Yan Chan, released Burma's first hip-hop album **Beginning (Sa-Tin-Gyin)** in **2000**; it topped the Burmese charts for over two months.
- **Sai Sai Kham Leng** debuted in 2000 with *Chocolate Yaung Yayge Einmet*; his 2001 follow-up *Thangegyin Myar Swar* made him a star; annual *Sai Sai Birthday Show* since 10 April 2004.
- Generational structure (per Wikipedia's *Burmese hip-hop* article): 1st gen (Acid, Theory, NS, Too Big), 2nd gen (9mm, Project-1, Byauk-Oh, Examplz, G-Family, On-Track, L.E.E, Cyclone, M.H.A., J-Me, Bigg-Y, G-Tone...), 3rd gen since late 2006 (Jouk Jack, Kyaw Htut Swe, VIP/Rock$tar, Hlwan Paing).

## Provenance model

Every record and relationship carries `sourceIds` / `source` pointing to `sources.json`, plus:
- `status`: `VERIFIED` (human-checked), `AI_EXTRACTED` (pending review), `CONFLICTED`, `REJECTED`
- `confidence`: high / medium / low

## Copyright & scope

Factual metadata only (names, dates, places). No article text, lyrics, or images are redistributed. Copyrighted sources (The Street magazine scans, Myanmore, Insight Myanmar, Coconuts) are cited for facts only under scholarly citation.

## Status

This is the seed release (Phase 1 of the roadmap): public web sources ingested and cross-checked. Next phases: OCR of *The Street* scanned issues, LLM-assisted extraction, MMDB/MusicBrainz cross-checks, conflict resolution.

## Sources

See `data/sources.json` for full bibliographic records, including:
- Wikipedia: *Burmese hip-hop*, *Acid (hip-hop group)*, *Sai Sai Kham Leng*
- Coconuts Yangon (2017), Myanmore (2017), Insight Myanmar Ep.604, YouTube documentary
