'use client';

import { useParams } from 'next/navigation';
import { CheckoutClient } from './CheckoutClient';

export default function CheckoutPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  if (!id) return null;
  return <CheckoutClient courseId={id} />;
}
