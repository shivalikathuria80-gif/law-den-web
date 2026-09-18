import { LawyerProfile } from '../../../../views/LawyerProfile';

export default async function LawyerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LawyerProfile slug={slug} />;
}
