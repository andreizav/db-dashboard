import QdrantView from '@/components/QdrantView';

export default function QdrantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Qdrant Vector Inspector</h1>
      <QdrantView />
    </div>
  );
}
