import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMassPage({ params }: PageProps) {
  const { id } = await params;
  
  // Redirect to the mass view page - editing is now done via modal
  redirect(`/missas/${id}`);
}
