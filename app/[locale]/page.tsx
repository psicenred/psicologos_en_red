import type { Metadata } from 'next';
import { HomePage } from '@/components/features/home/HomePage';

export const metadata: Metadata = {
  title: 'Inicio',
  description: 'Tu camino hacia el bienestar emocional',
};

export default function Page() {
  return <HomePage />;
}
