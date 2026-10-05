import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Particle Studio – Glow & Particle Background Generator',
  description: 'Generate golden dust, bokeh, fairy lights, flares, fire rings and 70 more glowing backgrounds. Export 8K PNG/JPG with Adobe Stock title & keywords.',
};
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Navbar /><main>{children}</main><Footer /></body></html>);
}
