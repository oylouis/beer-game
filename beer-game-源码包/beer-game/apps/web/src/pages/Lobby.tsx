import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GlobalView, RoomPublic, Role } from '@beer-game/shared';
import { ROLES, ROLE_NAMES } from '@beer-game/shared';
import { getSocket } from '../socket';
import { OrderChart, InventoryChart } from '../components/Charts';
import { RoleBadge } from '../components/bits';
import { getScenarios } from '../api';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(getSocket());
  const [global, setGlobal] = useState<GlobalView | null>(null);
  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [scenarios, setScenarios] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [toast, setToast] = useState('');
  const [copyBtn, setCopyBtn] = useState('复制房间码');

  const teacherToken = localStorage.getItem('bg_teacher_token') || '';

  useEffect(() => {
    const socket = socketRef.current;
    if (roomId) {
      socket.emit('teacher:join', { roomId, teacherToken }, (ack: any) => {
        if (!ack?.ok) {
          setToast(ack?.error || '讲师连接失败');
          return;
        }
        socket.emit('room:subscribe', { roomId }, () => {});
      });
    }
    const onRoom = (r: RoomPublic) => setRoom(r);
    const onGlobal = (g: GlobalView) => {
      setGlobal(g);
      setRoom(g.room);
    };
    socket.on('room:update', onRoom);
    socket.on('teacher:global', onGlobal);
    getScenarios().then(setScenarios).catch(() => {});
    return () => {
      socket.off('room:update', onRoom);
      socket.off('teacher:global', onGlobal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function fire(evt: string, more: any = {}, onDone?: () => void) {
    const socket = socketRef.current;
    socket.emit(evt, { roomId, teacherToken, ...more }, (ack: any) => {
      if (!ack?.ok) setToast(ack?.error || '操作失败');
      onDone?.();
    });
  }

  function copyCode() {
    if (room?.code) {
      navigator.clipboard?.writeText(room.code).then(() => {
        setCopyBtn('已复制 ✓');
        setTimeout(() => setCopyBtn('复制房间码'), 1500);
      });
    }
  }

  const statusText: Record<string, string> = {
    idle: '空闲', playing: '进行中', paused: '已暂停', ended: '已结束',
  };

  return (
    <div className="max-w-3xl mx-auto min-h-[100dvh] pb-safe">
      <div className="bg-slate-900 text-white px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">讲师控制台</p>
            <p className="text-lg font-bold">
              房间码 <span className="text-2xl tracking-widest text-emerald-400">{room?.code}</span>
            </p>
          </div>
          <div className="text-right">
            <button onClick={copyBtn === '复制房间码' ? copyCode : undefined} className="text-sm bg-emerald-600 px-3 py-2 rounded-xl active:bg-emerald-700">
              {copyBtn}
            </button>
            <div className="text-xs mt-1">第 {room?.week ?? 0} / {room?.totalWeeks ?? 0} 周 · {statusText[room?.status || 'idle']}</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {toast && <p className="text-amber-600 text-sm bg-amber-50 rounded-xl py-2 px-3">{toast}</p>}

        {/* 角色与玩家 */}
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">角色与玩家</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ROLES.map((role) => {
              const p = room?.players.find((x) => x.role === role);
              return (
                <div key={role} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <RoleBadge role={role} />
                    {p?.isAI && <span className="text-xs text-slate-400">AI代玩</span>}
                  </div>
                  {p ? (
                    <>
                      <p className="text-sm font-medium text-slate-800">
                        {p.name} {p.isAI ? '' : <span className={`text-xs ${p.connected ? 'text-emerald-500' : 'text-slate-300'}`}>{p.connected ? '·在线' : '·离线(由系统接管？)'}</span>}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        {!p.isAI && (room?.status === 'idle') && (
                          <button onClick={() => fire('teacher:kick', { role })} className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg min-h-[32px]">
                            踢出
                          </button>
                        )}
                        {p.isAI && (
                          <button onClick={() => fire('teacher:removeAI', { role })} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg min-h-[32px]">
                            移除AI
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button onClick={() => fire('teacher:addAI', { role })} disabled={!!room && room.status !== 'idle' && room.status !== 'paused'}
                      className="w-full text-xs text-brand-600 bg-brand-50 py-2 rounded-xl min-h-[36px] disabled:opacity-40">
                      + AI 补位
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">把房间码发给 4 名学生，他们各自加入一个角色。</p>
        </section>

        {/* 需求场景 */}
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">需求场景</h2>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => fire('teacher:scenario', { scenarioId: s.id })}
                className={`px-3 py-2 rounded-xl text-sm border min-h-[40px] ${room?.scenarioId === s.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">{scenarios.find((s) => s.id === room?.scenarioId)?.description}</p>
        </section>

        {/* 控制 */}
        <section>
          <h2 className="font-semibold text-slate-700 mb-2">游戏控制</h2>
          <div className="grid grid-cols-3 gap-2">
            {(room?.status === 'idle' || room?.status === 'paused') && (
              <button onClick={() => fire('teacher:start')} className="col-span-3 bg-emerald-600 text-white py-3 rounded-xl font-bold min-h-[48px] active:bg-emerald-700">
                ▶ 开始（或重开）
              </button>
            )}
            {room?.status === 'playing' && (
              <>
                <button onClick={() => fire('teacher:pause')} className="bg-amber-500 text-white py-3 rounded-xl font-bold min-h-[48px]">⏸ 暂停</button>
                <button onClick={() => fire('teacher:step')} className="bg-brand-500 text-white py-3 rounded-xl font-bold min-h-[48px]">⏭ 单步</button>
                <button onClick={() => fire('teacher:reset')} className="bg-slate-500 text-white py-3 rounded-xl font-bold min-h-[48px]">↺ 重置</button>
              </>
            )}
            {room?.status === 'ended' && (
              <>
                <button onClick={() => navigate(`/review/${roomId}`)} className="col-span-2 bg-brand-600 text-white py-3 rounded-xl font-bold min-h-[48px]">查看复盘</button>
                <button onClick={() => fire('teacher:reset')} className="bg-slate-500 text-white py-3 rounded-xl font-bold min-h-[48px]">↺ 重开</button>
              </>
            )}
          </div>
        </section>

        {/* 全局数据 */}
        {global && room && room.status !== 'idle' && (
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-700">全局透视</h2>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 overflow-x-auto">
              <p className="text-xs text-slate-400 mb-2">各角色订单量（牛鞭效应）</p>
              <OrderChart data={global.roleSummaries} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 overflow-x-auto">
              <p className="text-xs text-slate-400 mb-2">各角色库存</p>
              <InventoryChart data={global.roleSummaries} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}