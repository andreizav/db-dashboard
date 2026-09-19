import RedisView from '@/components/RedisView';

export default function RedisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Redis Inspector</h1>
      <RedisView />
    </div>
  );
}
