import Link from 'next/link';
import { monthSlug, type MetaDeck, type MetaReport } from '@/lib/editorial-meta';

function deckName(deck: MetaDeck) {
  const conditions = ['Hog Rider','Royal Giant','Graveyard','Minion Giant','X-Bow','Mortar','Goblin Drill','Balloon','Golem','Lava Hound','Royal Hogs','Miner','Goblin Barrel','Giant','Ram Rider','Battle Ram'];
  const cards = deck.cards.map(c => c.name);
  const leader = conditions.find(name => cards.includes(name)) || cards[0];
  return leader+' + '+(deck.cards.find(c => c.name !== leader && c.form !== 'Base')?.name || cards.find(name => name !== leader));
}

export function RankedReport({report,title,month=false,months=[]}: {report: MetaReport | null; title: string; month?: boolean; months?: string[]}) {
  const supported = report?.decks.filter(d => d.games >= 30).sort((a,b) => b.winRate-a.winRate || b.games-a.games)[0];
  return <main className="min-h-screen bg-gradient-to-b from-violet-100 via-white to-orange-50 px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <nav className="mb-7 flex gap-4 text-sm font-semibold text-violet-700 dark:text-violet-300">
        <Link href="/" className="min-h-11 content-center underline underline-offset-4">← Rival Royale</Link>
        <Link href="/guides" className="min-h-11 content-center underline underline-offset-4">Strategy guides</Link>
      </nav>
      <header className="mb-8">
        <p className="text-sm font-extrabold uppercase tracking-widest text-violet-700 dark:text-violet-300">Global Ranked · Rival Royale</p>
        <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">{month ? 'A calendar-month summary of the Ranked matches our weekly samples captured.' : 'The decks top players brought to Ranked this week, ordered by how often they appeared in their recent battle logs.'}</p>
      </header>
      {!report ? <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Weekly report not published yet</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">A verified leaderboard snapshot has not been connected. Rankings will appear after a successful collection and publication. Meanwhile, explore our <Link className="font-semibold underline" href="/guides">strategy guides</Link>.</p>
      </section> : <>
        <section aria-label="Dataset overview" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Deck appearances', report.sampledPlayerDeckAppearances.toLocaleString()],
            ['Decks displayed', String(report.decks.length)],
            ['Minimum sample', String(report.minGames)],
            ['Distinct battles', String(report.physicalMatches)]].map(([label, value]) =>
            <div key={label} className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
            </div>)}
        </section>
        <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">Window: <time dateTime={report.windowStart}>{new Date(report.windowStart).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })}</time> – <time dateTime={report.windowEnd}>{new Date(report.windowEnd).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })}</time> · {report.cohort}. {report.sampledPlayers !== undefined && <>Read {report.sampledPlayers} player logs; {report.playerLogsFailed ?? 0} failed.</>} Logs contain eligible battles on {report.daysObserved.length} distinct UTC dates.</p>
        {report.decks[0] && <aside className="mb-6 max-w-3xl border-l-4 border-orange-400 pl-4"><h2 className="font-black">Reading this sample</h2><p className="mt-2">{deckName(report.decks[0])} was the most common exact list, accounting for {report.decks[0].games} of {report.sampledPlayerDeckAppearances.toLocaleString()} deck appearances ({report.decks[0].usageRate}%). {report.decks[1] && <>The next most frequent list appeared {report.decks[1].games} times.</>} {supported && <> Among the displayed lists with at least 30 appearances, {deckName(supported)} recorded the highest observed win rate ({supported.wins} wins in {supported.games} appearances). Repeat appearances by the same player can influence both rankings.</>}</p></aside>}
        <section aria-labelledby="top-decks" className="space-y-4">
          <h2 id="top-decks" className="text-2xl font-black">Most played decks in this sample</h2>
          {report.decks.length === 0 ? <p>Not enough qualifying matches to rank decks reliably this week.</p> : report.decks.map((deck, index) =>
            <article key={deck.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">#{index + 1} · {deckName(deck)}</h3>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">{deck.games.toLocaleString()} games observed</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {deck.cards.map(card => <div key={card.id} className="min-w-0 rounded-lg bg-slate-100 p-1 text-center dark:bg-slate-800">
                  {card.icon.startsWith('https://') ? <img src={card.icon} alt={card.name} loading="lazy" width="100" height="120" className="mx-auto aspect-[4/5] w-full object-contain" /> : <div aria-hidden className="aspect-[4/5]" />}
                  <span className="block break-words text-[11px] font-semibold sm:text-xs" title={card.name}>{card.name}</span>
                  {card.form !== "Base" && <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300">{card.form}</span>}
                </div>)}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-slate-500 dark:text-slate-400">Observed win rate</dt><dd className="text-xl font-black tabular-nums">{deck.winRate.toFixed(1)}%</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Sample usage</dt><dd className="text-xl font-black tabular-nums">{deck.usageRate.toFixed(2)}%</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Average elixir</dt><dd className="text-xl font-black">{deck.averageElixir?.toFixed(1) ?? "Unavailable"}</dd></div>
                <div><dt className="text-slate-500 dark:text-slate-400">Wins / games</dt><dd className="text-xl font-black tabular-nums">{deck.wins} / {deck.games}</dd></div>
              </dl>
            </article>)}
        </section>
        <section className="mt-10 max-w-4xl rounded-2xl border border-violet-100 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-bold">How we calculate these rankings</h2>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{report.methodology}</p>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">A deck used frequently is not necessarily the best deck. Small samples, leaderboard selection, balance patches, and repeat matches can influence results. These are observed statistics, not model predictions or an exhaustive census of all Clash Royale matches.</p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last collected <time dateTime={report.publishedAt}>{new Date(report.publishedAt).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })}</time>.</p>
        </section>
      </>}
      <nav aria-label="Related reports and tools" className="mt-8 flex flex-wrap gap-4 font-bold text-violet-700 dark:text-violet-300">{months.map(m => <Link key={m} className="min-h-11 underline capitalize" href={'/meta/'+monthSlug(m)}>{monthSlug(m).replace('-',' ')} report</Link>)}<Link className="min-h-11 underline" href="/editorial/october-2026-balance-changes">October balance analysis</Link><Link className="min-h-11 underline" href="/counter-deck">Find a counter deck</Link><Link className="min-h-11 underline" href="/matchup">Analyze a matchup</Link></nav>
    </div>
  </main>;
}
