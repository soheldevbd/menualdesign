import Link from 'next/link';

const features = [
  ['✨', '190+ glow styles', 'Golden dust, bokeh, fairy lights, lens flares, fire rings, aurora, fireworks, galaxies and more.'],
  ['🎲', 'Never repeats', 'Each design is picked to be far from everything you generated before, and every result has a seed.'],
  ['🖼️', 'Up to 8K', 'Export in HD, 4K or 8K with 16:9, 1:1, 4:5, 9:16 and 3:2 ratios.'],
  ['🫥', 'Transparent PNG', 'Download the glow alone and overlay it on photos, video or designs.'],
  ['🏷️', 'Stock metadata', 'Title and keywords are generated for you, written straight into your downloaded JPG or PNG.'],
  ['⚡', 'Runs in your browser', 'Your designs are drawn locally on canvas; sign in to access the Studio.'],
];
const groups = [['Dust & Glitter', 45], ['Fairy Lights', 44], ['Fire & Glitter Rings', 20], ['Bokeh & Snow', 205], ['Galaxies & Stars', 265], ['Fireworks', 355],
  ['Aurora', 140], ['Lens Flares', 205], ['Sunrays', 42], ['Spotlights', 285], ['Waves & Streaks', 190], ['Bubbles & Confetti', 330]];

const niches = [['Diwali', 28], ['Ramadan & Eid', 48], ['Christmas', 355], ['New Year', 215], ['Halloween', 28], ['Valentine', 345],
  ['Black Friday', 0], ['Wedding', 42], ['Lunar New Year', 5], ['Luxury', 45], ['Tech & AI', 205], ['Autumn', 25]];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="dots" aria-hidden="true">
          {Array.from({ length: 48 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, width: 2 + (i % 4), height: 2 + (i % 4), animationDelay: `${(i % 9) * 0.5}s` }} />
          ))}
        </div>
        <div className="wrap hero-in">
          <span className="pill">190+ styles · up to 8K · transparent PNG</span>
          <h1>Create stunning <span className="grad">glow &amp; particle</span> backgrounds in one click</h1>
          <p className="lead muted">Golden dust, bokeh, fairy lights, flares, fire rings and more — generated in your browser, ready for wallpapers, overlays and stock.</p>
          <div className="cta"><Link href="/studio" className="btn lg">Open the Studio</Link><Link href="/guide" className="btn ghost lg">Read the guide</Link></div>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h2 center">Everything you need</h2>
        <div className="grid3">
          {features.map(([icon, t, d]) => (<div className="card" key={t}><div className="icon">{icon}</div><h3>{t}</h3><p className="muted">{d}</p></div>))}
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h2 center">A style for every mood</h2>
        <div className="grid4">
          {groups.map(([name, hue]) => (
            <Link href="/studio" key={name} className="swatch" style={{ '--h': hue }}><span>{name}</span></Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h2 center">Seasonal &amp; niche themes</h2>
        <p className="muted lead center">Ready-made looks for holidays, events and business topics, each with matching stock keywords.</p>
        <div className="grid4">
          {niches.map(([name, hue]) => (<Link href="/studio" key={name} className="swatch" style={{ '--h': hue }}><span>{name}</span></Link>))}
        </div>
      </section>

      <section className="wrap section">
        <h2 className="h2 center">How it works</h2>
        <div className="grid3">
          {[['1', 'Choose a style', 'Pick from 190+ presets and set size and ratio.'], ['2', 'Tweak the look', 'Color, saturation, density, bloom and vignette.'], ['3', 'Download', 'PNG, JPG or transparent PNG, with title and keywords.']].map(([n, t, d]) => (
            <div className="card step" key={n}><div className="num">{n}</div><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
        <div className="center" style={{ marginTop: 36 }}><Link href="/studio" className="btn lg">Start creating</Link></div>
      </section>
    </>
  );
}
