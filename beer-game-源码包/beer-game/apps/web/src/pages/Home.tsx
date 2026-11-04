import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, createPractice, joinRoom } from '../api';
import { getSocket } from '../socket';

function AppHeader() {
  return (
    <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white px-5 py-8 pb-10">
      <div className="max-w-xl mx-auto">
        <p className="text-xs opacity-80 mb-1">经典啤酒游戏 · 非官方教学复刻</p>
        <h1 className="text-2xl font-bold">啤酒游戏：牛鞭效应云端模拟</h1>
        <p className="text-sm mt-2 opacity-90">
          体验供应链中订单逐级放大的“牛鞭效应”，控制库存与缺货，学会供应链协同。
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3">
      <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
        {n}
      </div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState<'join' | 'teacher' | 'practice'>('join');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needName = () => {
    if (!name.trim()) {
      setError('请先填写你的名字');
      return false;
    }
    return true;
  };

  async function onJoin() {
    if (!needName()) return;
    if (!roomCode.trim()) return setError('请输入房间码');
    setError(''); setLoading(true);
    try {
      const res = await joinRoom(roomCode.trim(), name.trim());
      const socket = getSocket();
      socket.emit('player:join', { code: roomCode.trim(), name: name.trim() }, (ack: any) => {
        if (ack?.ok) {
          localStorage.setItem('bg_token', res.player.token);
          localStorage.setItem('bg_role', res.player.role);
          navigate(`/player/${ack.roomId}`);
        } else {
          setLoading(false);
          setError(ack?.error || '加入失败');
        }
      });
    } catch (e) {
      setLoading(false);
      setError((e as Error).message);
    }
  }

  async function onTeacher() {
    setError('');
    if (loading) return;
    setLoading(true);
    try {
      const res = await createRoom('啤酒游戏教室', teacherName.trim() || '讲师');
      localStorage.setItem('bg_teacher_token', res.teacherToken);
      localStorage.setItem('bg_room_id', res.roomId);
      navigate(`/lobby/${res.roomId}`);
    } catch (e) {
      setLoading(false);
      setError((e as Error).message);
    }
  }

  async function onPractice() {
    if (!needName()) return;
    const chosen = (document.getElementById('role-select') as HTMLSelectElement)?.value || 'RETAILER';
    setError(''); setLoading(true);
    try {
      const res = await createPractice(chosen, name.trim());
      localStorage.setItem('bg_token', res.player.token);
      localStorage.setItem('bg_role', res.player.role);
      localStorage.setItem('bg_room_id', res.roomId);
      navigate(`/player/${res.player.role}?practice=1&room=${res.roomId}&code=${res.code}`);
    } catch (e) {
      setLoading(false);
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-[100dvh] pb-safe">
      <AppHeader />

      <div className="max-w-xl mx-auto px-5 -mt-5">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-3">
            {[
              ['join', '加入房间'],
              ['practice', '单人练习'],
              ['teacher', '讲师开房'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setTab(k as any); setError(''); }}
                className={`py-3 text-sm font-medium transition-colors ${
                  tab === k ? 'bg-white text-brand-600 border-b-2 border-brand-500' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base min-h-[44px] mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            {tab === 'join' && (
              <div>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入讲师提供的房间码"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base min-h-[44px] mb-3 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={onJoin}
                  disabled={loading}
                  className="w-full bg-brand-600 text-white py-3 rounded-xl text-base font-semibold min-h-[48px] active:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? '加入中…' : '加入房间'}
                </button>
              </div>
            )}

            {tab === 'practice' && (
              <div>
                <label className="block text-sm text-slate-500 mb-1">选择你控制的角色</label>
                <select
                  id="role-select"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base min-h-[48px] mb-3 bg-white"
                  defaultValue="RETAILER"
                >
                  <option value="RETAILER">零售商（面对最终顾客）</option>
                  <option value="WHOLESALER">批发商</option>
                  <option value="DISTRIBUTOR">分销商</option>
                  <option value="FACTORY">工厂</option>
                </select>
                <button
                  onClick={onPractice}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl text-base font-semibold min-h-[48px] active:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? '创建中…' : '开始单人练习'}
                </button>
                <p className="text-xs text-slate-400 mt-2">
                  其余 3 个角色由 AI 代理，AI 使用合法策略（不偷看未来需求）。
                </p>
              </div>
            )}

            {tab === 'teacher' && (
              <div>
                <input
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="讲师名字（可选）"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base min-h-[44px] mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={onTeacher}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-base font-semibold min-h-[48px] active:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? '创建中…' : '创建房间'}
                </button>
              </div>
            )}

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-slate-100 mt-4 p-3">
          <p className="font-semibold px-3 pt-2">玩法简介</p>
          <Step n={1} title="角色成链" desc="零售商 ← 批发商 ← 分销商 ← 工厂，只有零售商面对顾客。" />
          <Step n={2} title="每周下单" desc="每周期接收货物、满足订单、计算成本，然后向上一环下单。" />
          <Step n={3} title="信息隔离" desc="只能看到自己的库存、在途与成本，看不到全局与未来需求。" />
          <Step n={4} title="复盘牛鞭效应" desc="结束后查看订单方差放大倍数与全链成本，讨论优化。" />
        </div>

        <p className="text-center text-xs text-slate-400 mt-4 pb-4">
          基于经典啤酒游戏教学机制的非官方复刻 · 与 MIT 无官方关联
        </p>
      </div>
    </div>
  );
}