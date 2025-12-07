import { LucidProvider } from '../../context/LucidContext';
import ClientDashboard from '../dashboard/ClientDashboard'

export default function StudentWithProvider() {
  return (
    <LucidProvider>
      <ClientDashboard />
    </LucidProvider>
  );
}