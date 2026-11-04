import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import type { PlayerView, Role } from '@beer-game/shared';
import { getSocket } from '../socket';
import { RoleBadge, StatCard } from '../components/bits';
import { formatMoney } from '../lib/format';

export default function Player() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const socketRef = useRef(getSocket());
  const [view, setView] = useState<PlayerView | null>(null);
  const [order, setOrder] = useState('4');
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState(false);

  const token = localStorage.getItem('bg_token') || '';
  const practice = params.get('practice') === '1';
  const code = params.get('code') || '';

  useEffect(() => {
    const socket = socketRef.current;
    const token0 = localStorage.getItem('bg_token') || '';
    // 尝试重连
    if (!view) {
      socket.emit('player:reconnect', { token: token0 }, (ack: any) => {
        if (!ack?.ok) return;
        if (roomId) socket.emit('room:subscribe', { roomId }, () => {});
      });
    }
    const onState = (v: PlayerView) => {
      setView(v);
      if (v.status !== 'ended') setPending(false);
    };
    const onRoom = (room: any) => {
      if (room?.gameOver && !practice) {
        navigate(`/review/${roomId}`);
      }
    };
    const onKicked = () => navigate('/');
    socket.on('player:state', onState);
    socket.on('room:update', onRoom);
    socket.on('player:kicked', onKicked);
    socket.on('room:started', () => setPending(false));
    if (roomId) socket.emit('room:subscribe', { roomId }, () => {});
    return () => {
      socket.off('player:state', onState);
      socket.off('room:update', onRoom);
      socket.off('player:kicked', onKicked);
      socket.off('room:started');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function submitOrder() {
    if (!view || !roomId || practice) return;
    const n = Number(order);
    if (!Number.isInteger(n) || n < 0) return setToast('请输入非负整数');
    setPending(true);
    const socket = socketRef.current;
    socket.emit('player:order', { roomId, token, order: n }, (ack: any) => {
      if (!ack?.ok) {
        setToast(ack?.error || '下单失败');
        setPending(false);
      } else {
        setToast('订单已提交 ✓');
        setTimeout(() => setToast(''), 1500);
      }
    });
  }

  const numPad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', '清'];

  function onKey(k: string) {
    if (k === '⌫') setOrder((o) => o.slice(0, -1));
    else if (k === '清') setOrder('');
    else {
      if (order.length >= 5) return;
      setOrder((o) => o + k);
    }
  }

  return (
    <div className="max-w-xl mx-auto min-h-[100dvh] flex flex-col pb-safe">
      {/* 顶栏 */}
      <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {view?.role && <RoleBadge role={view.role} />}
          <span className="text-sm font-semibold">第 {view?.week ?? 0} / {view?.totalWeeks ?? 0} 周</span>
        </div>
        <div className="flex items-center gap-2">
          {practice && code && <span className="text-xs bg-white/15 rounded-full px-2 py-1">练习·{code}</span>}
          {view?.gameOver && (
            <button onClick={() => navigate(`/review/${roomId}`)} className="text-xs bg-brand-500 px-3 py-1.5 rounded-full">
              查看复盘
            </button>
          )}
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="text-xs text-slate-300">
            退出
          </button>
        </div>
      </div>

      {!view ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">连接中…</div>
      ) : (
        <>
          {/* 状态卡片 */}
          <div className="px-4 pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard label="当前库存" value={`${view.inventory} 箱`} accent />
              <StatCard label="在途" value={`${view.incoming} 箱`} />
              <StatCard label="本周缺货" value={`${view.backlog} 箱`} />
              <StatCard label="本周成本" value={formatMoney(view.weekCost)} />
              <StatCard label="收到的订单" value={`${view.orderReceived} 箱`} sub="本周上游送到的最大需求" />
              <StatCard label="累计成本" value={formatMoney(view.cumulativeCost)} sub={`库存${formatMoney(view.inventoryCost)}·缺货${formatMoney(view.backlogCost)}`} />
            </div>
          </div>

          {/* 下单区 */}
          <div className="px-4 mt-4 flex-1 flex flex-col">
            <p className="text-sm font-semibold text-slate-700 mb-2">本周向{view.role === 'FACTORY' ? '生产部门' : '上游供应商'}下订单</p>
            <div className="flex items-stretch gap-2">
              <div className="flex-1 bg-white rounded-2xl border-2 border-brand-500 shadow-sm flex items-center justify-center">
                <span className="text-4xl font-bold text-slate-900">{order}</span>
                <span className="ml-1 text-slate-400">箱</span>
              </div>
              <button
                onClick={submitOrder}
                disabled={pending || view.status === 'ended'}
                className="bg-brand-600 text-white w-28 rounded-2xl text-base font-bold min-h-[60px] active:bg-brand-700 disabled:opacity-40"
              >
                {pending ? '…' : '提交订单'}
              </button>
            </div>

            {/* 数字键盘 */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {numPad.map((k) => (
                <button
                  key={k}
                  onClick={() => onKey(k)}
                  className={`h-14 rounded-xl text-lg font-semibold active:scale-95 transition-transform ${
                    k === '⌫' || k === '清'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* 提示 / 历史简报 */}
          <div className="px-4 mt-4 mb-8">
            {toast && <p className="text-center text-emerald-600 text-sm mb-2">{toast}</p>}
            {view.status === 'paused' ? (
              <p className="text-center text-amber-600 text-sm bg-amber-50 rounded-xl py-2">游戏已暂停，等待讲师继续</p>
            ) : view.status === 'idle' ? (
              <p className="text-center text-slate-400 text-sm bg-white rounded-xl py-2">等待讲师开始游戏…</p>
            ) : view.status === 'ended' ? (
              <p className="text-center text-brand-600 text-sm bg-brand-50 rounded-xl py-2">本局结束，可查看复盘</p>
            ) : (
              <p className="text-center text-slate-400 text-xs mb-3">提示：本周须为非负整数，提交后不可撤销</p>
            )}

            {view.history.length > 0 && (
              <details className="mt-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <summary className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-pointer">
                  我的历史（{view.history.length} 周）
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400">
                      <tr>
                        <th className="px-3 py-2">周</th><th>收单</th><th>下单</th><th>库存</th><th>缺货</th><th>本周成本</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.history.slice(-10).map((h) => (
                        <tr key={h.week} className="border-t border-slate-50">
                          <td className="px-3 py-1.5 text-center">{h.week}</td>
                          <td className="text-center">{h.orderReceived}</td>
                          <td className="text-center">{h.orderPlaced}</td>
                          <td className="text-center">{h.inventory}</td>
                          <td className="text-center">{h.backlog}</td>
                          <td className="text-center">{formatMoney(h.weekCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  );
}