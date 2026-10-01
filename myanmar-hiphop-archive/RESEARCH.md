# Myanmar / Burmese Hip-Hop Archive — research ledger

> **This file is prose commentary, not data.** The machine-readable source of
> truth lives in the parent repo: `data/editorial.json` (status, research cut,
> positioning, method, limitations), `data/periods.json`, `data/images.json` and
> `data/sources.json`. This app keeps no data of its own. Edit those files.

**Research cut:** 29 September 2026  
**Status:** Working public-data archive  
**Positioning:** This project aims to be an early public data resource for Myanmar hip-hop. It does **not** claim to be the first website or first dataset.

## How to read the generations

The archive uses five practical navigation periods, not a universal academic or artist-authenticated generation system. “First generation,” “second generation,” and “third generation” appear in retrospective, community, or source-attributed usage. Where a roster or date is weakly supported, the UI keeps a visible qualifier instead of flattening it into a canon.

Note that the dataset ships **two distinct taxonomies**: `ui.generations` (six
buckets) and `ui.periods` (this editorial spine, five periods reaching to 2026).
They are not the same axis and the UI must not merge them.

Each generation carries a `basis`: `sourced` for Precursors through 3rd, and
**`asserted`** for 4th and New wave. Wikipedia's *Burmese hip-hop* article covers
three generations and cannot support a fourth. The 4G label rests on Yung Hugo's
own statement to HipHopDX in March 2022 — *"The pioneer of Myanmar hip hop is
Acid. I'm fourth-generation."* — and on MYANMORE's 2018 *"a new hip hop
generation has arrived."* The New wave bucket is the archive's own grouping of a
label-network cohort, built from copyright structure and LIFTED's 2023 scene
report. Neither has a sourced roster, and the 2018 boundary overlaps 4G because
nothing dates the shift. The UI must not present them in the same voice as
1st–3rd.

## The underground tape era

The 2008–2016 cassette/VCD/mixtape ecosystem is the best-documented decade in the
archive and entirely absent from streaming platforms. It survives in fan
archives rather than in catalogues:

- **Wildboy / Wildboyz Entertainment** (Mandalay) produced **Oasix** and
  **Y-Zet**, the clearest documented underground-to-mainstream pipeline in the
  dataset. Wildboy released a 12-track mixtape in Feb 2013; the group disbanded
  "in some year" per Oasix's Wikipedia article.
- **B-Clipz (B Clipz Recordz)** (Yangon, Aug 2008, 9 members) never released an
  album. Aung Ye' Htike reports circulating songs plus planned mixtapes, and
  that he produced around 20 songs in 2011.
- **M.R.C (Nine Win)** (Yangon) had a 15-name roster and MRC Music Production.
- **Y.H.S** (Yangon) was a recording studio, not a rap group.
- **B-Lord Family** (Yangon, 2009–2018) included X-Boxin.
- **Rock$tar** (Yangon, from 2002) was Ah Boy's group; Wikipedia calls him a
  "pioneer of the third generation of Burmese hip hop", which implies a fourth
  is a recognised category.
- **Jam It!** (Kan Daw Gyi Park from late 2012) ran 20+ gigs across Yangon and
  Mandalay by 2015 with 40+ acts, cross-genre with punk, metal and live graffiti.
  The best-documented underground live platform in the archive.

**The highest-value remaining work** is a systematic crawl of the ~23,000
archived `mmhiphopchannel.com` URLs plus the 2008–2011 `myanmarmp3album.com`
index. Note that MHC also reposted foreign albums — T.I. among them — so bulk
ingestion needs a Myanmar-linkage filter.

## Periods

### Precursors + ACID breakthrough — c. 1994–2000

Htein Lin’s historical account calls Myo Kyawt Myaing generally considered Burmese rap’s godfather and places ACID in late-1990s Yangon/Rangoon nightclub culture. Multiple reputable retrospective sources date ACID’s *Sa Tin Chin / SaTin Gyin / Sa-Tin-Chein* (*Beginning*) to 2000 and describe it as an immediate, chart-leading landmark. Sources often call this Myanmar’s first hip-hop album or ACID the first home-grown rap act. The archive stores that as an attributed claim, not exhaustive proof that no earlier local recording or performer existed.

### Underground consolidation — 2001–2005

The second-generation label is retained as a retrospective community description, not a fixed canon. Nay Win’s interview provides the clearest date-specific DIY trail: Snare formed in 2000, recorded a 40-copy unofficial home album in 2001, saw a later project disrupted around 2003–04, and is described as releasing/distributing a *Hip Hop Vibration* VCD in 2005. The solo/group credit for that 2005 release remains unresolved. The recurring 9mm, Project-1, Firecracker/Byauk-Oh, Examplz, On-Track, Cyclone, M.H.A. and related roster still needs act-by-act primary verification.

### 3G claims + mixed circulation — 2006–2010

A 2010 scholarly account documents a mixed circulation ecology: home-recorded demos, stage-show bootlegs, near-weekly cool-season shows in Yangon and Mandalay, and uploads to Burmesemtv.com. The specific late-2006 third-generation self-identification and VIP/Rock$tar roster are weakly sourced, so the UI marks them as qualified. Generation Wave is catalogued separately as an adjacent pro-democracy youth network using music, graffiti and pamphlets, not as a synonym for all late-2000s rap.

### Reform-era independent + digital scene — 2011–2020

BBC and Human Rights Watch date the end of pre-publication media censorship to 20 August 2012, while also documenting continued restrictive laws and self-censorship. Reporting on Y.A.K. documents women-led underground work, gender-focused songs, small venues and a locally made *Porn Face* video described as a minor YouTube sensation. Ko Minn’s *Soldier* supplies a Mandalay anti-civil-war example. Jam It!’s cross-genre history documents self-organised shows, social-platform use and label activity adjacent to hip-hop.

### Post-coup resistance + current scene — 2021–2026

Coda Story reported dozens of anti-military hip-hop tracks across Facebook, YouTube and SoundCloud in the first six weeks after the 1 February 2021 coup. Rap Against Junta is represented as a decentralized alliance of MCs, producers, DJs, engineers, promoters, organizers and graffiti artists. Its *DICKCOUNCIL* track count differs by source, so the archive preserves both descriptions. DVB documents Chiang Mai MOB Party events in 2024 and 2025 with Thai, Myanmar and international participation. Broader 2026 creative-diaspora context is available, but this research did not verify a 2026 RAJ release or MOB Party edition.

## Mandalay

The archive was long Yangon-centric because that is what English-language press
covered. Mandalay is where the tape scene actually happened.

- **Wildboy / Wildboyz Entertainment** produced **Oasix** and **Y-Zet** — the
  clearest documented underground-to-mainstream pipeline in the dataset. A 12-track
  mixtape in Feb 2013; the group disbanded "in some year" per Oasix's article. A
  19-member roster is recovered from two independent fan-archive mirrors.
- **Hein Htet Zaw** rapped in north Mandalay from 2013 and produced from 2016.
  He is also billed **HOT** and **OT the Croc** — three names, one person, on two
  independent publisher descriptions. His six albums/EPs carry **no year in any
  source**, so all six are recorded with a null year.
- **Khaing Myal Kyaw Swar** (b. 1997, Nan Taw Shae), rapper-producer, later with
  360 Beatz. Start year conflicts: 2013 on his own bio, 2014 elsewhere.
- **Mandalay Rapperz Crew (MRC)**, self-labelled, from 2011, studio TKG. Distinct
  from the Yangon `M.R.C` (Nine Win) that shares its initials.
- **Error MDY**, 9 members, 14-track mixtape Aug 2013, plus a Thingyan mixtape.
- **Thar Nge (MC Family)** carries the strongest Mandalay-scene evidence: two of
  Oasix's and Y-Zet's seven guest appearances on its 2013 mixtape, from the crew
  they both belonged to. City unverified.
- **Studio Mandalay** and **WCC** are the only named Mandalay studio and
  affiliation tag in the record.
- **Wareru** has a real 2011–2017 hip-hop catalogue, but his city is **not
  Mandalay** and the commonly repeated "Shan/Pa-O singer-rapper" framing is not
  sourceable either.

CAUTION: `hot` is an extremely common token in these archives — all 37 `hot` hits
in the catalogue are false positives. And **Thar Nge** names at least three
distinct Burmese artists: this rap crew, the Myanmar Idol S2 winner (pop/R&B), and
a Yangon jazz vocalist. Never merge them.

## Disputes

`data/disputes.json` holds 17 records with their evidence: 10 legal/censorship,
3 diss tracks, 1 crew exit, 1 credit dispute, 2 other. Each carries a `claim`, a
`response`, a `corroboration` statement, and a `status` of `settled`,
`disputed`, `unresolved` or `structurally unresolved`.

**"Beef" is the wrong word.** A sweep of ~23,000 archived fan-catalogue URLs
found that every post whose slug contains "beef" is a multi-artist posse cut, and
none names a target; one is titled *Beef History* and is performed by four
members of the same crew together. "vs" usually means a same-track
collaboration. "diss" is almost absent as a naming convention — the scene
absorbed the battle as a *performance* form, burying a diss in a cypher. "hate"
is about 90% romantic. The real Burmese marker is ရေးကောက်, used as a verb.

The one clean beef analogue is a deliberate pivot: DICKCOUNCIL producer Ko Aye
Win, a former battler, told Insight Myanmar he wanted to "switch the arrow
direction... to take on the military junta and Min Aung Hlaing or whoever, like
every tyrant across the globe". The target of the adversarial form migrated from
other rappers to the regime.

### Corrections made while researching

- **There is no beef between Y-Zet and Oasix or Mg Moe Aung.** Every source
  shows them as closest collaborators and duo partners. An earlier note implying
  one is retracted; the documented diss runs outward, to Hlwan Paing.
- **The Y-Zet concert death is not a beef killing.** The fight began with
  accidental elbowing while dancing at a free show, six years after the track.
- **G-Tone's 2007 sanction was a one-year ban, not an arrest** — and not 2008,
  as Coconuts (2015) garbled it.
- **Rock$tar and VIP are one group with two names.** The archive previously
  carried them as two crews; the real event is Ah Boy's departure.
- **Rappler's Telegram-doxing investigation is August 2023**, not March 2025.
- **The Overflow Festival charges are ss. 505-A, 294 and 114**, per the police
  statement.
- **Frenzo is a production company owned by Sai Sai Kham Leng**, not a collective.
- **A credit dispute here is an absent legal category**, not a quarrel: the
  Myanmar Music Association testified in 2016 that existing law "cannot give the
  necessary protection". A specific search for disputes around 99 Symphony's
  INTERNATION and Phyo Layy found none — he is not credited on that album.

## Key limitations

The authoritative version of this list is `data/editorial.json` → `limitations`
(23 entries) and the machine-readable `ui.coverage` block. Summarised:

- **Burmese-language research is the largest gap.** The strongest material for
  the tape era and the post-coup scene is Burmese-language, and search tooling
  could not run Burmese queries productively. What was gathered came from
  crawling known domains and the Wayback CDX index.
- **Identity.** 104 of 115 records have no published real name; 13 are
  `pseudonym` or `anonymised`, meaning deliberately withheld. VICE states one
  alias was adopted to protect its user from the military. Phyo Zeya Thaw was
  executed 25 July 2022; Byu Har is serving 20 years from Aug 2023; Lil Cado is
  deceased. Do not attempt to resolve a pseudonym, and do not merge records to
  "fix" a near-match — GRACEe/Grace and Yair Yint Aung are separate on the
  platforms and stay separate here.
- **Diaspora.** Of nine countries checked, only Thailand/Chiang Mai has a
  documented rap scene and it rests on a single outlet (DVB). The US has
  artist-level traces. India, Malaysia, Singapore, Japan, South Korea, Australia
  and the UK have nothing documented. That absence is a finding.
- **Music press.** Nothing found in Bandcamp Daily, OkayAfrica, The Fader,
  Pitchfork, Noisey or Rolling Stone, and nothing in Frontier Myanmar, Myanmar
  Now, The Diplomat or Nikkei Asia.
- **AI aggregators to avoid:** musicmetricsvault, sounddrain, viberate publish
  fabricated prose and invented listener figures. Viberate claims Lil Kee Boi is
  from South Korea; he is from Bago and based in Munich.
- **Platform dates are unreliable pre-2023.** Yan's releases carry 2014–2016
  dates with 2024 copyright strings; Bo Htet's *Heavy Weight* appears as both
  2020 and 2023; Yung Hugo's *Make Karen Great Again* slipped from July 2022 to
  Feb 2023. Affected records carry a `yearNote` with both values.
- **Contested identities.** NAY has two competing real-name candidates and may be
  two people (artist and mastering engineer). 223 was a trio of Yungpunch, Lil
  Cado and Zero, split 2021; which two remain is unverified. The platform Triple
  Edge is not established to be the Chiang Mai group. "KYI" is not established as
  Kan Kyi. TOXIC's Myanmar linkage rests on one joint release. Bo Gyi is
  unresearchable.
- **Pop artists are not underground.** Sophia Everest (via Myanmar Idol),
  Warso Moe Oo (via Shwe FM) and Ni Ni Khin Zaw appear in period `artistNames`
  rather than as artist records, so the underground framing is not widened.
- Romanisation varies: Anegga/Annaga; Phyo Zeya Thaw/Zayar/Zeyar Thaw; Sa Tin Chin/SaTin Gyin/Sa-Tin-Chein; Byauk-Oh/Byout-Oh; Examplz/Examplez; J-Me/JME; Bigg-Y/Bigg Y; G-Tone/G Tone; Bunny Phyoe/Bunny Phyo.
- “First” is a source-attributed description, not a complete priority audit.
- The 2001–05 roster is incomplete and unevenly sourced. G-Family’s placement is contradictory.
- The late-2000s 3G/VIP genealogy is especially tentative.
- Post-coup rosters are incomplete because aliases, concealed identities, displacement, platform removals and safety risk limit documentation.
- The archive does not claim that hip-hop changed public opinion or political outcomes. The evidence supports solidarity and mobilization among participants, not a measured causal effect.
- Image assets in `public/media/` are editorial reference images with credits and source links. They are **not** represented as public-domain assets. Verify permission before redistribution. Credits are recorded in `data/images.json`; alt text and per-period captions live in `data/periods.json`, because one file is captioned differently in different periods.
- Acts named in the sources but without an entity record (Y.A.K., Ko Minn, 9KT, …; Rap Against Junta and GRACEE now have records) are carried in `data/periods.json` under `artistNames` and surface in the UI as `ui.periods[].unlinkedNames`. Promoting any of them to `data/artists.json` needs an act-level source first.

## References

The full source ledger, with ids, publishers, dates, licences, `quality` labels
and archived-copy links, is `data/sources.json` (128 records). The per-period
citation trail is `ui.periods[].sources`; the per-dispute trail is
`disputes[].sources`. Key entries for this round of work:

- **Mandalay:** the archived fan catalogue (`web.archive.org` copies of
  `mmhiphopchannel.com`, `mmhiphopug.blogspot.com`, `myanmarmp3album.com`),
  Studio Mandalay, Chartmetric and SoundCloud artist pages, LinkedIn and Playboard
  for Khaing Myal, the Mandalay `error-mdy` and `mandalay-rapperz-crew` mixtape
  posts
- **Disputes:** Coconuts Yangon on the Y-Zet concert death, the Irrawaddy and
  7Day Burmese reports, Y-Zet's own 2018 apology, VICE 2023, Insight Myanmar's
  Ko Aye Win interview, DVB on the G-Tone ban, the Myanmar Police Force
  statements via Positive Angle News and Eleven Media, Rappler, BBC, AP, RFA,
  Mizzima, VOA, PEN America, the Observer/Somo Telenor case, GNLM, Reuters, and
  VOA Burmese on the copyright-law gap
- **Structure:** de Bakker's *The Beat of Yangon*, The World/PRX on `copy thachin`
  and on 9KT/MK, HipHopDX on Yung Hugo (via Wayback, as HipHopDX is offline)
