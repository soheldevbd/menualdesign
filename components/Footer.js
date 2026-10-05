import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-grid">
        <div>
          <Link href="/" className="logo"><span className="logo-dot" />Particle<b>Studio</b></Link>
          <p className="muted">Procedural glow, bokeh and light-effect backgrounds. Generated in your browser — nothing is uploaded.</p>
        </div>
        <div><h4>Explore</h4><Link href="/">Home</Link><Link href="/studio">Studio</Link><Link href="/guide">Guide</Link></div>
        <div><h4>Features</h4><span>190+ styles</span><span>Up to 8K export</span><span>Transparent PNG</span><span>Stock metadata</span></div>
      </div>
      <div className="wrap copy">© {new Date().getFullYear()} Particle Studio. All rights reserved.</div>
    </footer>
  );
}
