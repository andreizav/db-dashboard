import PostgresView from '@/components/PostgresView';

export default function PostgresPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">PostgreSQL Inspector</h1>
      <PostgresView />
    </div>
  );
}
