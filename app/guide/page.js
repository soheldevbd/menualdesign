export const metadata = { title: 'Guide – Particle Studio' };
const blocks = [
  ['Best export settings', ['Use 4K or 8K PNG for the cleanest quality.', 'Choose JPG (100%) when a service needs JPG; title and keywords are embedded inside it.', 'Use Transparent PNG for overlays — it works best on dark backgrounds.']],
  ['Title & keywords', ['A title and up to 49 keywords are generated from the style and color.', 'Edit them so they describe your exact image; put the most important keywords first.', 'They are written inside the downloaded image (XMP for PNG and JPG, plus IPTC for JPG), so there is no separate file.']],
  ['Before you upload anywhere', ['Check the current contributor guidelines of the marketplace — formats, minimum size and rules for generated content can change.', 'Make sure the title and keywords match the image.', 'Generate several designs and upload only ones you like; each new design differs from your previous ones.']],
  ['Get more variety', ['Change the Color and Saturation sliders, or tick “Random color & density”.', 'Switch the Ratio — portrait and square layouts look different.', 'Use a Seed to recreate a design you liked later.']],
];
export default function Guide() {
  return (
    <section className="wrap section narrow">
      <h1 className="h2">Guide</h1>
      <p className="muted lead">Quick tips to get the most out of Particle Studio.</p>
      {blocks.map(([t, items]) => (
        <div className="card" key={t} style={{ marginBottom: 18 }}><h3>{t}</h3><ul>{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
      ))}
    </section>
  );
}
