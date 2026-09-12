import { Container } from '@/components/Container';
import { FaBasketball, FaBagShopping, FaShirt, FaHatCowboy } from 'react-icons/fa6';

const categories = ['ALL', 'APPAREL', 'HEADWEAR', 'ACCESSORIES', 'TEAM GEAR', 'LIMITED EDITION'];

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,.2),transparent_65%)] py-16">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[.25em] text-rcl-orange">THE SHOP</p>
          <h1 className="mt-3 max-w-2xl font-display text-5xl font-black uppercase sm:text-7xl">Gear the <span className="text-rcl-orange">culture.</span></h1>
          <p className="mt-5 max-w-xl text-gray-400">RCL jerseys, apparel, team gear, and limited pieces made for the Rich City basketball world.</p>
        </Container>
      </section>
      <Container maxWidth="xl" className="py-10">
        <div className="flex gap-2 overflow-x-auto pb-2">{categories.map((category) => <span key={category} className="whitespace-nowrap rounded-full border border-white/10 px-4 py-2 text-[10px] font-black tracking-widest text-gray-400">{category}</span>)}</div>
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['RCL GEAR', FaShirt, 'Jerseys, shirts, and hoodies'],
            ['HEADWEAR', FaHatCowboy, 'Hats and court-ready accessories'],
            ['COLLECTIBLES', FaBasketball, 'Limited edition RCL pieces'],
          ].map(([title, Icon, description]) => {
            const CategoryIcon = Icon as typeof FaShirt;
            return <div key={title as string} className="rounded-2xl border border-white/10 bg-white/[.03] p-6"><CategoryIcon className="text-3xl text-rcl-orange" /><h2 className="mt-6 font-display text-xl font-bold">{title as string}</h2><p className="mt-2 text-sm text-gray-500">{description as string}</p></div>;
          })}
        </section>
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[.03] p-12 text-center"><FaBagShopping className="mx-auto text-4xl text-rcl-gold" /><h2 className="mt-5 font-display text-2xl font-bold">The first RCL collection is coming soon.</h2><p className="mx-auto mt-3 max-w-md text-sm text-gray-400">No products are available yet. Check back for official RCL merchandise.</p></div>
      </Container>
    </main>
  );
}
