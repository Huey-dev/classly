import ClientLayout from './component/ClientLayout';
import VideoGrid from '../app/component/VideoGrid';

export default function Page() {
  return (
    <ClientLayout>
      <div className="mt-2">
        <VideoGrid />
      </div>
      
    </ClientLayout>
  );
}