'use client';
import { useEffect } from 'react';
import { initStudio } from '../lib/studio';

// Uncontrolled inputs: the canvas engine in lib/studio.js reads and writes these by id.
export default function Studio() {
  useEffect(() => {
    initStudio();
    const desktopButton = document.getElementById('regen-desktop');
    const mobileButton = document.getElementById('regen');
    const trigger = () => document.getElementById('regen')?.click();
    desktopButton?.addEventListener('click', trigger);
    return () => {
      desktopButton?.removeEventListener('click', trigger);
    };
  }, []);
  return (
    <div className="studio-layout">
      <div className="studio-mobile-create studio-toolbar">
        <button id="regen" className="btn studio-create-btn">＋ Create Design</button>
        <button id="dl-mobile" className="btn studio-download-btn" type="button">Download</button>
      </div>
      <aside className="studio-sidebar">
        <div className="studio-sidebar-title">Design tools</div>
        <div className="panel controls">
          <label className="field">Style<select id="style" /></label>
          <label className="field">Size
            <select id="res" defaultValue="3840"><option value="1920">HD (1920 px)</option><option value="3840">4K (3840 px)</option><option value="7680">8K (7680 px)</option></select>
          </label>
          <label className="field">Ratio
            <select id="ratio" defaultValue="16:9"><option value="16:9">16:9 Wallpaper / YouTube</option><option value="1:1">1:1 Instagram post</option><option value="4:5">4:5 Instagram portrait</option><option value="9:16">9:16 Story / Reels</option><option value="3:2">3:2 Photo</option></select>
          </label>
          <label className="field">Format<select id="fmt" defaultValue="jpg"><option value="jpg">JPG (100%, stock-ready)</option><option value="png">PNG (lossless)</option></select></label>
          <label className="field">Density<input id="density" type="range" min="0.3" max="2" step="0.1" defaultValue="1" /></label>
          <label className="field">Color<input id="hue" type="range" min="0" max="360" step="1" defaultValue="45" /></label>
          <label className="field">Saturation<input id="sat" type="range" min="0" max="100" step="1" defaultValue="95" /></label>
          <label className="field">Bloom<input id="bloom" type="range" min="0" max="1.5" step="0.1" defaultValue="0.6" /></label>
          <label className="field">Vignette<input id="vig" type="range" min="0" max="0.8" step="0.05" defaultValue="0.3" /></label>
          <label className="field">Tone mix<input id="mix" type="range" min="0" max="1" step="0.1" defaultValue="0.6" /></label>
          <label className="field">Seed<input id="seed" type="number" /></label>
          <label className="field">Batch count<input id="bcount" type="number" min="1" max="50" defaultValue="10" /></label>
          <label className="field">Batch mode<select id="bmode" defaultValue="same"><option value="same">Current style</option><option value="random">Random styles</option></select></label>
          <label className="check"><input id="auto" type="checkbox" defaultChecked /> Random color &amp; density each time</label>
          <label className="check"><input id="tr" type="checkbox" /> Transparent PNG (no black background)</label>
        </div>
        <div className="panel meta">
          <h3>Stock metadata</h3>
          <label className="field">Title<input id="mtitle" maxLength="200" /></label>
          <label className="field">Keywords (comma separated)<textarea id="mkeys" rows="3" /></label>
          <p className="muted small">Title and keywords are embedded in the downloaded file when supported. Both fields are editable.</p>
        </div>
      </aside>
      <main className="studio-workspace">
        <div className="studio-desktop-create studio-toolbar">
          <button id="regen-desktop" className="btn studio-create-btn" type="button">＋ Create Design</button>
          <button id="dl" className="btn studio-download-btn" type="button">Download</button>
          <button id="reset" className="btn ghost studio-clear-btn" type="button">Clear history</button>
        </div>
        <div className="stage"><canvas id="c" /></div>
        <div id="info" className="muted center" />
      </main>
    </div>
  );
}
