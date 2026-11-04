import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ReviewData } from '@beer-game/shared';
import { api } from '../env';
import { OrderChart, CostChart, InventoryChart } from '../components/Charts';
import { RoleBadge } from '../components/bits';
import { formatMoney } from '../lib/format';

export default function Review() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('bg_teacher_token') || '';
    fetch(`${api.base}/api/rooms/${roomId}/review`, { headers: { 'x-teacher-token': token } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('复盘获取失败（可能游戏未结束）'))))
      .then(setReview)
      .catch((e) => setError((e as Error).message));
  }, [roomId]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto min-h-[100dvh] flex flex-col items-center justify-center px-5 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="bg-brand-600 text-white px-5 py-3 rounded-xl min-h-[48px]">返回首页</button>
      </div>
    );
  }

  if (!review) return <div className="max-w-xl mx-auto text-center text-slate-400 pt-20">加载复盘…</div>;

  const bestRole = Object.entries(review.totalCosts).sort((a, b) => a[1] - b[1])[0];

  return (
    <div className="max-w-3xl mx-auto min-h-[100dvh] pb-safe">
      <div className="bg-slate-900 text-white px-5 py-4 sticky top-0 z-10">
        <p className="text-sm text-slate-300">复盘报告 · 房间 {review.code}</p>
        <p className="text-xl font-bold mt-1">
          牛鞭效应放大倍数：<span className="text-emerald-400 text-2xl">{review.varianceMultiplier}</span> 倍
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <button onClick={() => navigate('/lobby/' + roomId)} className="text-sm text-brand-600">← 返回控制台</button>

        {/* 成本汇总 */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-semibold text-slate-700 mb-3">累计成本</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(review.totalCosts).map(([role, cost]) => (
              <div key={role} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <RoleBadge role={role as any} size="sm" />
                <span className="font-bold text-slate-800">{formatMoney(cost)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">最低成本角色：{bestRole ? bestRole[0] : '-'}</p>
        </section>

        {/* 图表 */}
        {[
          { title: '订单量曲线（牛鞭效应核心）', chart: <OrderChart data={review.roleSummaries} /> },
          { title: '库存变化', chart: <InventoryChart data={review.roleSummaries} /> },
          { title: '累计成本曲线', chart: <CostChart data={review.roleSummaries} /> },
        ].map((c, i) => (
          <section key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 overflow-x-auto">
            <h2 className="font-semibold text-slate-700 mb-2">{c.title}</h2>
            {c.chart}
          </section>
        ))}

        {/* 讨论问题 */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h2 className="font-semibold text-slate-700 mb-3">课堂讨论问题</h2>
          <ul className="space-y-2">
            {review.discussionQuestions.map((q, i) => (
              <li key={i} className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{q}</li>
            ))}
          </ul>
        </section>

        {/* 导出 */}
        <section className="grid grid-cols-2 gap-2 pb-4">
          <a
            href={`${api.base}/api/rooms/${roomId}/export.csv`}
            className="bg-brand-600 text-white text-center py-3 rounded-xl font-bold min-h-[48px]"
            download
          >
            导出 CSV
          </a>
          <a
            href={`${api.base}/api/rooms/${roomId}/export.json`}
            className="bg-slate-800 text-white text-center py-3 rounded-xl font-bold min-h-[48px]"
            download
          >
            导出 JSON
          </a>
        </section>
      </div>
    </div>
  );
}