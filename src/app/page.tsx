import { Container } from '@/components/Container';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-rcl-black py-16 text-rcl-white">
      <Container>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-rcl-gold">
          Richmond basketball
        </p>
        <h1 className="font-display text-4xl font-bold sm:text-6xl">Rich City League</h1>
        <p className="mt-4 max-w-xl text-lg text-gray-300">
          The league platform foundation is ready for the next development phase.
        </p>
      </Container>
    </main>
  );
}
