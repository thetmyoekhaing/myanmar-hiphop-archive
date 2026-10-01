import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, BookOpen, Camera, Disc3, ExternalLink, Gavel, MapPin, Menu,
  Network, Search, ShieldAlert, Skull, Users, X,
} from 'lucide-react';
// Single source of truth: the public dataset, built from ../data/ into
// ../dist/myanmar-hiphop.json. This app holds no data of its own.
import archive from '@archive';
import './styles.css';

const { entities, ui, graph, meta } = archive;
const { artists, crews, releases, events, sources, songs, venues } = entities;
/**
 * Periods, images and editorial are editorial framing rather than canonical
 * records, so the build keeps them under `ui` and not under `entities`.
 * Disputes are canonical but also mirrored at the top level, since they are
 * claims rather than records. Read each from where it actually lives.
 */
const periods = ui.periods ?? [];
const images = ui.images ?? [];
const disputes = archive.disputes ?? entities.disputes ?? [];
const { editorial, generations, coverage, milestones, facets, disputePatterns, timeline } = ui;
const detail = archive.entityDetail;

/** Prefers an archived copy when the live source URL is dead. */
const readAt = (s) => s.readAt || s.url;
const sourceById = (id) => sources.find((s) => s.id === id);

/* ------------------------------------------------------------------ *
 * Small pieces
 * ------------------------------------------------------------------ */

function Tag({ children, className = '' }) { return <span className={`tag ${className}`}>{children}</span>; }

function SectionMark({ number, children }) {
  return <div className="section-mark"><span>{number}</span><i />{children}</div>;
}

/** Renders a source id as a citation link. */
function Cite({ id }) {
  const s = sourceById(id);
  if (!s) return null;
  return <a className="cite" href={readAt(s)} target="_blank" rel="noreferrer">{s.publication} <ExternalLink size={10} /></a>;
}

/**
 * The single most important component in the app. Every record in this
 * archive carries an evidence state, and a bare fact without it is exactly
 * what the project exists to avoid.
 */
function Evidence({ status, confidence, sourceIds = [], note }) {
  const tone = status === 'VERIFIED' ? 'ok' : status === 'CONFLICTED' ? 'warn' : status === 'REJECTED' ? 'bad' : 'dim';
  return (
    <div className={`evidence ${tone}`}>
      {status && <Tag className="ev-tag">{status.replace('_', ' ')}</Tag>}
      {confidence && <Tag className="ev-tag">{confidence}</Tag>}
      {sourceIds.length > 0 && <span className="ev-srcs">{sourceIds.map((id) => <Cite key={id} id={id} />)}</span>}
      {note && <p className="ev-note">{note}</p>}
    </div>
  );
}

/** Flags a pseudonym or anonymised identity, and shows a real name only if published. */
function Identity({ artist }) {
  if (!artist) return null;
  const s = artist.identityStatus;
  if (s === 'named') return <span className="ident named">aka {artist.realName}</span>;
  if (s === 'pseudonym') return <span className="ident pseudo">pseudonym — identity withheld</span>;
  if (s === 'anonymised') return <span className="ident pseudo">anonymised</span>;
  return <span className="ident none">no published real name</span>;
}

function Years({ from, to }) {
  if (from === null && to === null) return <span className="years">dates unrecorded</span>;
  return <span className="years">{from ?? '?'}–{to ?? 'present'}</span>;
}

/* ------------------------------------------------------------------ *
 * Artist profile
 * ------------------------------------------------------------------ */

function ReleaseList({ releases: list, onOpenArtist, onOpenCrew }) {
  if (!list.length) return <p className="empty">No release recorded.</p>;
  const byType = list.reduce((acc, r) => { (acc[r.type] ??= []).push(r); return acc; }, {});
  const order = ['album', 'compilation', 'EP', 'mixtape', 'collection', 'live', 'single'];
  return (
    <div className="rel-groups">
      {order.filter((t) => byType[t]).map((t) => (
        <section key={t} className="rel-group">
          <h4>{t}<span>{byType[t].length}</span></h4>
          <ul>
            {byType[t].map((r) => {
              const full = releases.find((x) => x.id === r.id) ?? {};
              return (
                <li key={r.id} className="rel">
                  <Disc3 size={14} />
                  <div className="rel-main">
                    <b>{r.title}</b>
                    <small>
                      {r.year ?? 'year unrecorded'}
                      {r.trackCount ? ` · ${r.trackCount} tracks` : ''}
                      {r.billing === 'co-lead' && r.coArtist ? <> · with {r.coArtist.name}</> : null}
                      {r.via === 'crew' ? ' · crew release' : null}
                    </small>
                    {full.note && <p className="rel-note">{full.note}</p>}
                    {full.yearNote && <p className="rel-warn">{full.yearNote}</p>}
                    {full.labelId && <span className="rel-label">{detail[full.labelId]?.name ?? full.labelId}</span>}
                  </div>
                  {r.id === undefined ? null : (
                    <button className="mini" onClick={() => onOpenArtist?.(full.artistId)}>artist</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DisputeCard({ d, onOpenArtist, full = false }) {
  const tone = d.status === 'settled' ? 'ok' : d.status === 'disputed' ? 'warn' : d.status === 'structurally unresolved' ? 'struct' : 'dim';
  return (
    <article className={`dispute ${tone}`}>
      <header>
        <Tag className="d-type">{d.type}</Tag>
        <Tag className="ev-tag">{d.status}</Tag>
        {d.period && <span className="d-period">{d.period}</span>}
      </header>
      <div className="d-parties">
        {d.resolvedParties?.map((p) => (
          <button key={p.id} className="chip" onClick={() => onOpenArtist?.(p.id)}>{p.name}</button>
        ))}
        {d.partyNames?.map((n) => <span key={n} className="chip unnamed">{n}</span>)}
        {d.targetDescription && <><span className="d-arrow">→</span><span className="chip target">{d.targetDescription}</span></>}
      </div>
      <p className="d-claim">{d.claim}</p>
      {full && d.response && <p className="d-response"><b>Response.</b> {d.response}</p>}
      {full && d.evidence && <p className="d-evidence"><b>Evidence.</b> {d.evidence}</p>}
      {full && d.corroboration && <p className="d-corr"><b>Corroboration.</b> {d.corroboration}</p>}
      {full && d.corroboratingDetail && <p className="d-detail">{d.corroboratingDetail}</p>}
      {d.safety && <p className="d-safety"><ShieldAlert size={13} /> {d.safety}</p>}
      {full && <p className="d-srcs">{d.sources?.map((s) => <Cite key={s.id} id={s.id} />)}</p>}
    </article>
  );
}

function ArtistProfile({ id, onOpenArtist, onOpenCrew, onOpenDispute }) {
  const a = detail[id];
  const [tab, setTab] = useState('releases');
  useEffect(() => setTab('releases'), [id]);
  if (!a) return <p className="empty">No record for “{id}”.</p>;

  const featured = meta.guide.keyEntities?.find((k) => k.id === id);
  const gen = generations.find((g) => g.id === a.generation);
  const songsFor = songs.filter((s) => s.artistId === id || (entities.songs.find((x) => x.id === s.id)?.releaseId && a.releases.some((r) => r.id === s.releaseId)));

  return (
    <article className="profile">
      <header className="profile-head">
        <div className="ph-main">
          <div className="ph-kicker">
            {a.generationLabel && <Tag>{a.generationLabel}</Tag>}
            {gen && <Tag className={gen.basis === 'asserted' ? 'tag-red' : ''}>{gen.basis}</Tag>}
            <Tag>{a.type}</Tag>
            {a.isDiaspora && <Tag className="tag-diaspora">diaspora</Tag>}
          </div>
          <h2>{a.name}</h2>
          {a.aliases?.length > 0 && <p className="aliases">{a.aliases.join(' · ')}</p>}
          <p className="ph-meta">
            <Identity artist={a} />
            <Years from={a.activeFrom} to={a.activeTo} />
            {a.city && <span className="ph-city"><MapPin size={12} /> {a.city}</span>}
            {a.base && <span className="ph-base">base {a.base}</span>}
            {a.born && <span>born {a.born}</span>}
            {a.died && <span className="ph-died">died {a.died}</span>}
          </p>
          {a.genre?.length > 0 && <p className="ph-genre">{a.genre.join(' · ')}</p>}
        </div>
        <dl className="ph-stats">
          <div><dt>releases</dt><dd>{a.releases.length}</dd></div>
          <div><dt>tracks</dt><dd>{songsFor.length}</dd></div>
          <div><dt>crews</dt><dd>{a.crews.length}</dd></div>
          <div><dt>labels</dt><dd>{a.labels.length}</dd></div>
          <div><dt>disputes</dt><dd className={a.disputes.length ? 'hot' : ''}>{a.disputes.length}</dd></div>
        </dl>
      </header>

      {a.note && <p className="profile-note">{a.note}</p>}

      {(a.crews.length > 0 || a.labels.length > 0) && (
        <div className="affil">
          {a.crews.map((c) => <button key={c.id} className="chip crew" onClick={() => onOpenCrew?.(c.id)}><Users size={12} /> {c.name}</button>)}
          {a.labels.map((l) => <button key={l.id} className="chip label" onClick={() => onOpenCrew?.(l.id)}><Disc3 size={12} /> {l.name}</button>)}
        </div>
      )}

      {a.disputes.length > 0 && (
        <section className="profile-block">
          <h3><Gavel size={16} /> Disputes and records <span>{a.disputes.length}</span></h3>
          <div className="dispute-list">
            {a.disputes.map((d) => <DisputeCard key={d.id} d={disputes.find((x) => x.id === d.id)} onOpenArtist={onOpenArtist} full />)}
          </div>
        </section>
      )}

      <nav className="tabs">
        {[['releases', `releases ${a.releases.length}`], ['tracks', `tracks ${songsFor.length}`], ['live', `shows ${a.events.length}`], ['relations', `relations ${a.relations.length}`], ['sources', `sources ${a.sources.length}`]].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>

      {tab === 'releases' && <ReleaseList releases={a.releases} onOpenArtist={onOpenArtist} onOpenCrew={onOpenCrew} />}

      {tab === 'tracks' && (
        <ul className="track-list">
          {songsFor.map((s) => {
            const full = entities.songs.find((x) => x.id === s.id) ?? s;
            return (
              <li key={s.id}>
                <b>{s.title}</b>
                <small>{s.year ?? 'year unrecorded'}{s.releaseId ? ` · from ${detail[s.releaseId]?.title ?? s.releaseId}` : ''}</small>
                {s.note && <p>{s.note}</p>}
              </li>
            );
          })}
          {songsFor.length === 0 && <p className="empty">No individual track recorded. Many artists here are documented only at release level.</p>}
        </ul>
      )}

      {tab === 'live' && (
        <ul className="track-list">
          {a.events.map((e) => {
            const full = events.find((x) => x.id === e.id) ?? {};
            return (
              <li key={e.id}>
                <b>{e.name}</b>
                <small>{e.date ?? 'date unrecorded'}{e.venue ? ` · ${e.venue}` : ''}</small>
                {full.note && <p>{full.note}</p>}
                <Evidence status={full.status} confidence={full.confidence} sourceIds={full.sourceIds} />
              </li>
            );
          })}
          {a.events.length === 0 && <p className="empty">No documented performance.</p>}
        </ul>
      )}

      {tab === 'relations' && (
        <div className="rel-groups">
          <section className="rel-group">
            <h4>outgoing<span>{a.relations.length}</span></h4>
            <ul>{a.relations.map((r, i) => <li key={i} className="rel"><Network size={14} /><div className="rel-main"><b>{r.type.replace(/_/g, ' ')} → {r.toLabel}</b><Evidence status={r.status} confidence={r.confidence} note={r.note} /></div></li>)}</ul>
          </section>
          {a.groups.length > 0 && (
            <section className="rel-group">
              <h4>groups<span>{a.groups.length}</span></h4>
              <ul>{a.groups.map((g) => <li key={g.id} className="rel"><Users size={14} /><div className="rel-main"><b>{g.name}</b></div><button className="mini" onClick={() => onOpenCrew?.(g.id)}>open</button></li>)}</ul>
            </section>
          )}
        </div>
      )}

      {tab === 'sources' && (
        <ul className="src-list">
          {a.sources.map((s) => (
            <li key={s.id}>
              <a href={readAt(s)} target="_blank" rel="noreferrer">{s.title} <ExternalLink size={11} /></a>
              <small>{s.publication}{s.quality ? ` · ${s.quality}` : ''}{s.url !== readAt(s) ? ' · archived copy' : ''}</small>
            </li>
          ))}
        </ul>
      )}

      {a.periods.length > 0 && (
        <p className="profile-periods">Active in: {a.periods.map((p) => p.label).join(' · ')}</p>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * Crew / label profile
 * ------------------------------------------------------------------ */

function CrewProfile({ id, onOpenArtist, onOpenCrew }) {
  const c = detail[id];
  if (!c) return <p className="empty">No record for “{id}”.</p>;
  return (
    <article className="profile">
      <header className="profile-head">
        <div className="ph-main">
          <div className="ph-kicker">
            <Tag>{c.kindOfEntity}</Tag>
            {c.formed && <Tag>{c.formed}{c.dissolved ? `–${c.dissolved}` : '–'}</Tag>}
            {c.city && <Tag className="tag-city"><MapPin size={11} /> {c.city}</Tag>}
          </div>
          <h2>{c.name}</h2>
          {c.status && <p className="ph-meta"><span>{c.status}</span></p>}
        </div>
        <dl className="ph-stats">
          <div><dt>members</dt><dd>{c.members.length}</dd></div>
          <div><dt>releases</dt><dd>{c.releases.length}</dd></div>
          <div><dt>relations</dt><dd>{c.relations.length}</dd></div>
        </dl>
      </header>
      {c.note && <p className="profile-note">{c.note}</p>}

      {c.releases.length > 0 && (
        <section className="profile-block">
          <h3><Disc3 size={16} /> Releases <span>{c.releases.length}</span></h3>
          <ul className="track-list">
            {c.releases.map((r) => <li key={r.id}><b>{r.title}</b><small>{r.year ?? 'year unrecorded'} · {r.type}{r.trackCount ? ` · ${r.trackCount} tracks` : ''} · {r.artist}{r.via === 'crew' ? ' (crew release)' : ''}</small></li>)}
          </ul>
        </section>
      )}

      {c.members.length > 0 && (
        <section className="profile-block">
          <h3><Users size={16} /> Members <span>{c.members.length}</span></h3>
          <div className="affil">{c.members.map((m) => <button key={m.id} className="chip" onClick={() => onOpenArtist(m.id)}>{m.name}</button>)}</div>
        </section>
      )}

      {c.relations.length > 0 && (
        <section className="profile-block">
          <h3><Network size={16} /> Relations <span>{c.relations.length}</span></h3>
          <ul className="track-list">
            {c.relations.map((r, i) => (
              <li key={i}>
                <b>{r.type.replace(/_/g, ' ')}: {getName(r.from)} → {getName(r.to)}</b>
                <Evidence status={r.status} confidence={r.confidence} note={r.note} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="profile-block">
        <h3><BookOpen size={16} /> Sources <span>{c.sources.length}</span></h3>
        <ul className="src-list">{c.sources.map((s) => <li key={s.id}><a href={readAt(s)} target="_blank" rel="noreferrer">{s.title} <ExternalLink size={11} /></a><small>{s.publication}{s.quality ? ` · ${s.quality}` : ''}</small></li>)}</ul>
      </section>
    </article>
  );
}

const getName = (id) => detail[id]?.name ?? id;

/* ------------------------------------------------------------------ *
 * Network view
 * ------------------------------------------------------------------ */

function NetworkView({ onOpenArtist, onOpenCrew }) {
  const [focus, setFocus] = useState(null);
  const nodes = graph.nodes;
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const adj = useMemo(() => {
    const m = {};
    for (const e of graph.edges) {
      (m[e.from] ??= []).push(e);
      (m[e.to] ??= []).push(e);
    }
    return m;
  }, []);

  const visible = focus ? [focus, ...new Set((adj[focus] ?? []).flatMap((e) => [e.from, e.to]))] : nodes.map((n) => n.id);
  const vis = new Set(visible);
  const byKind = nodes.reduce((a, n) => { a[n.kind] = (a[n.kind] ?? 0) + 1; return a; }, {});

  return (
    <div className="netview">
      <div className="net-controls">
        <label>
          <Network size={15} />
          <select value={focus ?? ''} onChange={(e) => setFocus(e.target.value || null)}>
            <option value="">Whole network ({nodes.length} nodes, {graph.edges.length} edges)</option>
            {nodes.filter((n) => n.kind === 'artist').map((n) => <option key={n.id} value={n.id}>Focus: {n.label}</option>)}
          </select>
        </label>
        <div className="net-legend">
          {Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => <span key={k} className={`lk lk-${k}`}>{k} {n}</span>)}
        </div>
        {focus && <button className="mini" onClick={() => setFocus(null)}>clear focus</button>}
      </div>
      {focus && <p className="net-hint">Showing {getName(focus)} and its {adj[focus]?.length ?? 0} edges.</p>}
      <ul className="net-list">
        {visible.slice(0, focus ? 400 : 120).map((id) => {
          const n = nodeById[id];
          if (!n) return null;
          const edges = (adj[id] ?? []).filter((e) => vis.has(e.from) && vis.has(e.to));
          return (
            <li key={id} className={`net-node k-${n.kind} ${focus === id ? 'focus' : ''}`}>
              <button className="nn-name" onClick={() => (n.kind === 'artist' ? onOpenArtist(id) : onOpenCrew?.(id))}>
                {n.label}
              </button>
              <small>{n.kind}{n.subtitle ? ` · ${n.subtitle}` : ''}{n.year ? ` · ${n.year}` : ''}</small>
              <ul className="nn-edges">
                {edges.slice(0, 6).map((e, i) => (
                  <li key={i} className={`e-${e.type} s-${e.status}`}>
                    <button onClick={() => (detail[e.from]?.kind === 'artist' ? onOpenArtist(e.from) : onOpenCrew?.(e.from))}>{e.fromLabel}</button>
                    <span className="e-t">{e.type.replace(/_/g, ' ')}</span>
                    <button onClick={() => (detail[e.to]?.kind === 'artist' ? onOpenArtist(e.to) : onOpenCrew?.(e.to))}>{e.toLabel}</button>
                  </li>
                ))}
                {edges.length > 6 && <li className="nn-more">+{edges.length - 6} more</li>}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * App
 * ------------------------------------------------------------------ */

const VIEWS = [
  ['explore', 'Explore'],
  ['artists', 'Artists'],
  ['releases', 'Releases'],
  ['crews', 'Crews & labels'],
  ['disputes', 'Disputes'],
  ['periods', 'Periods'],
  ['network', 'Network'],
  ['ledger', 'Ledger'],
];

function App() {
  const [view, setView] = useState('explore');
  const [artistId, setArtistId] = useState(null);
  const [crewId, setCrewId] = useState(null);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [gen, setGen] = useState('all');
  const [kind, setKind] = useState('all');
  const [menu, setMenu] = useState(false);

  const q = query.trim().toLowerCase();
  const openArtist = (id) => { if (id) { setArtistId(id); setView('explore'); setQuery(''); } };
  const openCrew = (id) => { if (id) { setCrewId(id); setView('explore'); setQuery(''); } };

  const cities = useMemo(() => [...new Set(artists.map((a) => a.city).filter(Boolean))].sort(), []);
  const filteredArtists = useMemo(() => artists.filter((a) => {
    if (city !== 'all' && a.city !== city) return false;
    if (gen !== 'all' && detail[a.id]?.generation !== gen) return false;
    if (kind !== 'all' && a.type !== kind) return false;
    if (!q) return true;
    const hay = `${a.name} ${(a.aliases ?? []).join(' ')} ${a.city ?? ''} ${a.base ?? ''} ${(a.genre ?? []).join(' ')} ${a.realName ?? ''}`.toLowerCase();
    return hay.includes(q);
  }), [q, city, gen, kind]);

  const filteredReleases = useMemo(() => releases.filter((r) => {
    if (!q) return true;
    return `${r.title} ${getName(r.artistId)} ${r.type} ${r.year ?? ''}`.toLowerCase().includes(q);
  }), [q]);

  const filteredCrews = useMemo(() => crews.filter((c) => {
    if (kind !== 'all' && c.kind !== kind && !(kind === 'label' && c.kindOfEntity === 'label')) return false;
    if (city !== 'all' && c.city !== city) return false;
    if (!q) return true;
    return `${c.name} ${c.city ?? ''} ${c.status ?? ''}`.toLowerCase().includes(q);
  }), [q, city, kind]);

  return (
    <div className="archive-app">
      <header className="masthead">
        <a className="wordmark" href="#top" onClick={() => { setView('explore'); setArtistId(null); setCrewId(null); }}>
          <span className="mark">MM</span><span>MYANMAR<br /><b>HIP-HOP ARCHIVE</b></span>
        </a>
        <nav>{VIEWS.map(([k, label]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => { setView(k); setArtistId(null); setCrewId(null); }}>{label}</button>)}</nav>
        <div className="edition"><span className="red-dot" /> OPEN DATA <span>{meta.counts.artists} artists</span></div>
        <button className="mobile-menu" aria-label="menu" onClick={() => setMenu(!menu)}><Menu size={18} /></button>
      </header>

      {menu && <div className="mobile-nav">{VIEWS.map(([k, label]) => <button key={k} onClick={() => { setView(k); setMenu(false); setArtistId(null); setCrewId(null); }}>{label}</button>)}</div>}

      <div className="searchbar">
        <label><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search artists, crews, releases, tracks, sources…" /></label>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">all cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={gen} onChange={(e) => setGen(e.target.value)}>
          <option value="all">all generations</option>
          {generations.map((g) => <option key={g.id} value={g.id}>{g.label} ({g.basis})</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">all types</option>
          {['solo', 'group', 'duo', 'collective', 'crew', 'label', 'association', 'studio', 'album', 'EP', 'mixtape', 'single', 'compilation', 'live', 'collection'].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        {(query || city !== 'all' || gen !== 'all' || kind !== 'all') && <button className="clear" onClick={() => { setQuery(''); setCity('all'); setGen('all'); setKind('all'); }}><X size={14} /> clear</button>}
      </div>

      <main id="top">
        {/* ---------------- EXPLORE / PROFILE ---------------- */}
        {view === 'explore' && (
          <>
            {artistId ? <ArtistProfile id={artistId} onOpenArtist={openArtist} onOpenCrew={openCrew} />
              : crewId ? <CrewProfile id={crewId} onOpenArtist={openArtist} onOpenCrew={openCrew} />
                : <Home onOpenArtist={openArtist} onOpenCrew={openCrew} onOpenDispute={(id) => { setView('disputes'); }} />}
          </>
        )}

        {/* ---------------- ARTISTS ---------------- */}
        {view === 'artists' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="A">ARTISTS</SectionMark>
              <h2>{filteredArtists.length}<br /><span>records.</span></h2>
              <p>{coverage.artists.withRealName} of {coverage.artists.total} have a published real name; {coverage.artists.pseudonymous} are deliberate pseudonyms or anonymised. {coverage.artists.activeFromUnknown} have no verified start year.</p>
            </div>
            <div className="art-grid">
              {filteredArtists.map((a) => {
                const d = detail[a.id];
                return (
                  <button key={a.id} className="art-card" onClick={() => openArtist(a.id)}>
                    <span className="ac-top"><Tag>{a.type}</Tag>{d?.generationLabel && <Tag className="tag-red">{d.generationLabel}</Tag>}{a.base && <Tag className="tag-diaspora">diaspora</Tag>}</span>
                    <b>{a.name}</b>
                    {a.aliases?.length > 0 && <small className="ac-alias">{a.aliases.slice(0, 3).join(' · ')}</small>}
                    <span className="ac-meta">
                      {a.city ? <span><MapPin size={11} /> {a.city}</span> : <span className="dim">city unrecorded</span>}
                      <span>{a.activeFrom ?? '—'}</span>
                      {d && <span>{d.releases.length} rel</span>}
                      {d?.disputes?.length > 0 && <span className="hot">{d.disputes.length} disputes</span>}
                    </span>
                    {d && a.identityStatus !== 'unverified' && <Identity artist={a} />}
                  </button>
                );
              })}
              {filteredArtists.length === 0 && <p className="empty">No artist matches. {coverage.periods.unlinkedNames} acts named in the sources still have no record — see Periods.</p>}
            </div>
          </section>
        )}

        {/* ---------------- RELEASES ---------------- */}
        {view === 'releases' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="B">RELEASES</SectionMark>
              <h2>{releases.length}<br /><span>catalogue.</span></h2>
              <p>{Object.entries(facets.releaseType).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(' · ')}. {coverage.releases.yearConflicted} have a conflicted year and {coverage.releases.yearUnknown} none at all — both are preserved, not resolved.</p>
            </div>
            <ul className="rel-table">
              {filteredReleases.slice(0, 300).map((r) => (
                <li key={r.id}>
                  <span className="rt-year">{r.year ?? '—'}</span>
                  <span className="rt-type"><Tag>{r.type}</Tag></span>
                  <button className="rt-title" onClick={() => openArtist(r.artistId)}>{r.title}</button>
                  <button className="rt-artist" onClick={() => openArtist(r.artistId)}>{getName(r.artistId)}</button>
                  {r.artistIdB && <button className="rt-artist dim" onClick={() => openArtist(r.artistIdB)}>with {getName(r.artistIdB)}</button>}
                  {r.trackCount && <span className="rt-tracks">{r.trackCount} tracks</span>}
                  {r.labelId && <span className="rt-label">{detail[r.labelId]?.name}</span>}
                  {r.yearNote && <span className="rt-warn" title={r.yearNote}>date conflict</span>}
                </li>
              ))}
            </ul>
            {filteredReleases.length > 300 && <p className="empty">Showing first 300 of {filteredReleases.length}.</p>}
          </section>
        )}

        {/* ---------------- CREWS ---------------- */}
        {view === 'crews' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="C">CREWS &amp; LABELS</SectionMark>
              <h2>The scene<br /><span>is a network.</span></h2>
              <p>The 2020s cohort is organised by <b>label</b>, not crew or city: Billionaire Minds Group dominates, with Eagle Element and b4 Records alongside. The 2010s underground ran on crews and studios — Wildboy, B-Clipz, Y.H.S, Studio Mandalay. Both navigations are in the same list.</p>
            </div>
            <div className="crew-grid">
              {filteredCrews.map((c) => (
                <button key={c.id} className={`crew-card k-${c.kindOfEntity}`} onClick={() => openCrew(c.id)}>
                  <span className="cc-top"><Tag>{c.kindOfEntity}</Tag>{c.formed && <span className="cc-years">{c.formed}–</span>}{c.city && <span className="cc-city"><MapPin size={10} /> {c.city}</span>}</span>
                  <b>{c.name}</b>
                  {c.status && <small>{c.status}</small>}
                  <span className="cc-meta">
                    <span>{c.memberIds.length} members</span>
                    <span>{releases.filter((r) => r.labelId === c.id).length} releases</span>
                    {c.disputes?.length > 0 && <span className="hot">{c.disputes.length} disputes</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- DISPUTES ---------------- */}
        {view === 'disputes' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="D">DISPUTES</SectionMark>
              <h2>&ldquo;Beef&rdquo; is<br /><span>the wrong word.</span></h2>
              <p>A sweep of ~23,000 archived fan-catalogue URLs found that &ldquo;beef&rdquo; in Burmese hip hop is overwhelmingly a <b>genre label and a song title</b>, not a grievance: every archived post whose slug contains &ldquo;beef&rdquo; is a posse cut, and none names a target. These {disputes.length} records are the disputes that survive scrutiny.</p>
            </div>

            <div className="pattern-grid">
              {Object.entries(disputePatterns).filter(([k, v]) => v && typeof v === 'object' && v.finding).map(([k, v]) => (
                <article key={k} className="pattern">
                  <h4>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</h4>
                  <p>{v.finding}</p>
                  {v.implication && <p className="pattern-imp"><b>So:</b> {v.implication}</p>}
                </article>
              ))}
            </div>

            <div className="dispute-filters">
              {Object.entries(facets.disputeType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <span key={t} className="df">{n} {t}</span>
              ))}
            </div>

            <div className="dispute-list big">
              {disputes
                .filter((d) => !q || `${d.claim} ${d.type} ${d.status} ${(d.resolvedParties ?? []).map((p) => p.name).join(' ')}`.toLowerCase().includes(q))
                .map((d) => <DisputeCard key={d.id} d={d} onOpenArtist={openArtist} full />)}
            </div>

            {disputePatterns.corrections && (
              <section className="corrections">
                <h3><Skull size={16} /> Corrections made to earlier versions of this archive</h3>
                <ol>{disputePatterns.corrections.map((c, i) => <li key={i}>{c}</li>)}</ol>
              </section>
            )}
          </section>
        )}

        {/* ---------------- PERIODS ---------------- */}
        {view === 'periods' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="E">PERIODS &amp; GENERATIONS</SectionMark>
              <h2>Two axes.<br /><span>Keep them apart.</span></h2>
              <p>Generations follow the labels the sources use; every bucket is marked <b>sourced</b> or <b>asserted</b>. Periods are the archive&rsquo;s own editorial spine. They are not the same thing and must not be merged.</p>
            </div>
            <div className="gens-grid">
              {generations.map((g) => (
                <article key={g.id} className={`gen-card ${g.basis}`}>
                  <header><span className="gen-period">{g.period}</span><Tag className={g.basis === 'asserted' ? 'tag-red' : ''}>{g.basis}</Tag></header>
                  <h3>{g.label}</h3>
                  <p>{g.summary}</p>
                  {g.caveat && <p className="gen-caveat">{g.caveat}</p>}
                  <footer><span>{g.count} artists</span><span>{g.crewIds.length} crews</span><span>{g.releaseIds.length} releases</span></footer>
                  <div className="gen-names">{g.artists.map((a) => a.name).join(' · ')}</div>
                </article>
              ))}
            </div>
            <div className="period-list-big">
              {periods.map((p) => (
                <article key={p.id} className="period-big">
                  <header><h3>{p.label}</h3><span className="pb-range">{p.range}</span></header>
                  <p className="pb-summary">{p.summary}</p>
                  <div className="pb-facts">{p.facts.map((f, i) => <p key={i}><span>↳</span>{f}</p>)}</div>
                  <p className="pb-conf">confidence: {p.confidence}</p>
                  <div className="pb-sources">{p.sources.map((s) => <Cite key={s.id} id={s.id} />)}</div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- NETWORK ---------------- */}
        {view === 'network' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="F">NETWORK</SectionMark>
              <h2>Who is<br /><span>connected.</span></h2>
              <p>{graph.nodes.length} nodes and {graph.edges.length} typed edges. Edge status lets you dim what is unverified. <b>{graph.disputeEdges.length}</b> dispute edges are held separately, because a beef is a claim, not a fact about two artists.</p>
            </div>
            <NetworkView onOpenArtist={openArtist} onOpenCrew={openCrew} />
          </section>
        )}

        {/* ---------------- LEDGER ---------------- */}
        {view === 'ledger' && (
          <section className="listing">
            <div className="section-intro">
              <SectionMark number="G">LEDGER</SectionMark>
              <h2>Nothing here<br /><span>without a trail.</span></h2>
              <p>{sources.length} sources, {milestones.length} milestone anchors, {events.length} events, {venues.length} venues. {Object.entries(facets.sourceQuality).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(' · ')}.</p>
            </div>

            <section className="ledger-block">
              <h3>What the dataset does not know</h3>
              <ul className="coverage-grid">
                <li><b>{coverage.artists.withRealName}/{coverage.artists.total}</b><span>artists with a published real name</span></li>
                <li><b>{coverage.artists.pseudonymous}</b><span>pseudonymous or anonymised</span></li>
                <li><b>{coverage.artists.activeFromUnknown}</b><span>no verified start year</span></li>
                <li><b>{coverage.releases.yearUnknown}</b><span>releases with no year</span></li>
                <li><b>{coverage.releases.yearConflicted}</b><span>releases with a conflicted year</span></li>
                <li><b>{coverage.periods.unlinkedNames}</b><span>named acts with no record</span></li>
                <li><b>{coverage.sources.archivedOnly}</b><span>sources cited only via archive</span></li>
                <li><b>{coverage.generations.asserted.length}</b><span>generation buckets asserted, not sourced</span></li>
              </ul>
            </section>

            <section className="ledger-block">
              <h3>Milestones</h3>
              <div className="ms-list">
                {milestones.map((m) => (
                  <article className="ms" key={m.id}>
                    <span className="ms-year">{m.year}</span>
                    <div>
                      <h4>{m.title}</h4>
                      <p>{m.text}</p>
                      <p className="ms-src">{m.sourceIds.map((id) => <Cite key={id} id={id} />)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ledger-block">
              <h3>Events <span>{events.length}</span></h3>
              <ul className="ev-list">
                {events.map((e) => (
                  <li key={e.id}>
                    <span className="ev-date">{e.date ?? 'undated'}</span>
                    <div>
                      <b>{e.name}</b>
                      <small>{[e.venueId ? venues.find((v) => v.id === e.venueId)?.name : null, e.city].filter(Boolean).join(' · ') || 'venue unrecorded'}</small>
                      {e.note && <p>{e.note}</p>}
                      <Evidence confidence={e.confidence} sourceIds={e.sourceIds} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="ledger-block">
              <h3>Timeline <span>{timeline.length} years</span></h3>
              <div className="tl">
                {timeline.map((t) => (
                  <div key={t.year} className="tl-year">
                    <b>{t.year}</b>
                    <ul>{t.entries.map((e, i) => <li key={i} className={`tl-e k-${e.kind}`}><span>{e.kind}</span>{e.title}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="ledger-block">
              <h3>Method &amp; limitations</h3>
              <p className="method">{editorial.methodNote}</p>
              <ol className="limits">{editorial.limitations.map((l, i) => <li key={i}>{l}</li>)}</ol>
            </section>

            <section className="ledger-block">
              <h3>Sources <span>{sources.length}</span></h3>
              <ul className="src-list big">
                {sources.map((s) => (
                  <li key={s.id}>
                    <a href={readAt(s)} target="_blank" rel="noreferrer">{s.title} <ExternalLink size={11} /></a>
                    <small>{s.publication}{s.date ? ` · ${s.date}` : ''}{s.quality ? ` · ${s.quality}` : ''}{s.url !== readAt(s) ? ' · archived copy' : ''}</small>
                    {s.note && <p>{s.note}</p>}
                  </li>
                ))}
              </ul>
            </section>

            <section className="ledger-block">
              <h3>Image credits</h3>
              <div className="gal">
                {images.map((im) => (
                  <figure key={im.id}>
                    <img src={im.path} alt={im.alt} />
                    <figcaption>{im.credit}<small>{im.note}</small></figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </section>
        )}
      </main>

      <footer>
        <span>MYANMAR HIP-HOP ARCHIVE</span>
        <span>{meta.counts.artists} artists · {meta.counts.releases} releases · {meta.counts.sources} sources</span>
        <span>RESEARCH CUT: {editorial.asOf}</span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Home / dashboard
 * ------------------------------------------------------------------ */

function Home({ onOpenArtist, onOpenCrew }) {
  const featured = (meta.guide.keyEntities ?? []).filter((k) => detail[k.id]);
  const underground = ui.highlights.undergroundToMainstream;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="kicker"><span className="red-line" />{editorial.asOf} / {editorial.status.replace(/_/g, ' ').toUpperCase()}</div>
          <h1>A history<br />that <em>moves.</em></h1>
          <p className="hero-lede">{editorial.positioning}</p>
          <p className="hero-lede">From the 1988 precursors through the underground cassette era, two Mandalay crews and one ACID album, to the coup, a collective on YouTube, and a new wave organised by label rather than by city.</p>
          <div className="hero-note"><ShieldAlert size={15} /><span>&lsquo;First&rsquo; is kept as a source-attributed claim.<br />The gaps stay visible.</span></div>
        </div>
        <div className="hero-stats">
          {[
            ['artists', meta.counts.artists, 'records'],
            ['releases', meta.counts.releases, 'albums to singles'],
            ['sources', meta.counts.sources, 'cited'],
            ['disputes', disputes.length, 'documented'],
            ['crews', crews.length, 'crews and labels'],
            ['cities', citiesCount(), 'cities'],
          ].map(([k, n, l]) => <div key={k}><b>{n}</b><span>{l}</span></div>)}
        </div>
      </section>

      <section className="lead-section">
        <div className="section-intro">
          <SectionMark number="01">START HERE</SectionMark>
          <h2>Load-bearing<br /><span>records.</span></h2>
          <p>Open any of these for its full profile, catalogue, crews, disputes and citations.</p>
        </div>
        <div className="lead-grid">
          {featured.map((k) => {
            const a = detail[k.id];
            return (
              <button key={k.id} className="lead-card" onClick={() => onOpenArtist(k.id)}>
                <b>{a.name}</b>
                <small>{a.generationLabel} · {a.type}{a.city ? ` · ${a.city}` : ''}</small>
                <span className="lc-meta">{a.releases.length} releases · {a.disputes.length} disputes · {a.sources.length} sources</span>
                <Identity artist={a} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="story-section">
        <div className="section-intro">
          <SectionMark number="02">THE PIPELINE</SectionMark>
          <h2>Tape to<br /><span>mainstream.</span></h2>
          <p>The archive&rsquo;s clearest documented through-line, and the best argument for why the underground years matter.</p>
        </div>
        <div className="pipeline">
          {underground && (
            <>
              <button className="pipe-node crew" onClick={() => onOpenCrew(underground.crew)}>
                <b>{underground.crewName}</b><small>{underground.city}</small>
              </button>
              {underground.memberIds.map((id) => (
                <button key={id} className="pipe-node" onClick={() => onOpenArtist(id)}>
                  <b>{detail[id]?.name}</b>
                  <small>{detail[id]?.releases.length ?? 0} releases</small>
                </button>
              ))}
            </>
          )}
        </div>
        <p className="pipe-note">{underground?.note}</p>
      </section>

      <section className="story-section">
        <div className="section-intro">
          <SectionMark number="03">THE RECORD</SectionMark>
          <h2>What happened,<br /><span>in order.</span></h2>
          <p>{milestones.length} sourced anchors, each attached to at least one citation.</p>
        </div>
        <div className="ms-list">
          {milestones.slice(0, 10).map((m) => (
            <article className="ms" key={m.id}>
              <span className="ms-year">{m.year}</span>
              <div><h4>{m.title}</h4><p>{m.text}</p><p className="ms-src">{m.sourceIds.map((id) => <Cite key={id} id={id} />)}</p></div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

const citiesCount = () => new Set(artists.map((a) => a.city).filter(Boolean)).size;

createRoot(document.getElementById('root')).render(<App />);
