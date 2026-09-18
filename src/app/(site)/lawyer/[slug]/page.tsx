import { LawyerProfile } from '../../../../views/LawyerProfile';
import { SEED_LAWYERS } from '../../../../data/seed';

/** Seeded profiles get a page each; profiles approved at runtime resolve client-side. */
export function generateStaticParams() {
  return SEED_LAWYERS.map((lawyer) => ({ slug: lawyer.slug }));
}

export default async function LawyerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LawyerProfile slug={slug} />;
}
