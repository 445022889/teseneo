import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, Calendar, DollarSign, Trash2, Edit2, BookOpen, Lock, RefreshCw, Send, AlertCircle, Save, Link2 } from 'lucide-react';
import { EventItem, EventLog, CalendarType, CycleType, AppSettings } from './types';
import { NeoButton, NeoCard, NeoInput, NeoSelect, NeoModal, NeoBadge } from './components/NeoUI';
import { getNextDate, getDaysUntil, formatDate, formatCurrency } from './utils/calculations';

export default function App() {
  // Auth & Config State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedLogin, setShowAdvancedLogin] = useState(false);

  // App Data State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ dailyPushTime: "09:00" });
  
  // UI State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  
  const [currentEditingEvent, setCurrentEditingEvent] = useState<EventItem | null>(null);
  const [selectedEventForLog, setSelectedEventForLog] = useState<string | null>(null);

  // --- Form States ---
  const [newEvent, setNewEvent] = useState<Partial<EventItem>>({
    name: '', date: '', calendarType: CalendarType.SOLAR, cycleType: CycleType.YEARLY, interval: 1, reminderDays: 3
  });

  const [newLog, setNewLog] = useState<Partial<EventLog>>({
    title: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: ''
  });

  // --- Init ---
  useEffect(() => {
    const savedPwd = localStorage.getItem('auth_password');
    const savedApiUrl = localStorage.getItem('api_base_url') || '';
    setApiBaseUrl(savedApiUrl);
    
    if (savedPwd) {
      setPassword(savedPwd);
      fetchData(savedPwd, savedApiUrl);
    }
  }, []);

  // --- API Helper ---
  const getApiUrl = (endpoint: string, baseUrlOverride?: string) => {
     // Use override if provided, else state, else default to relative path
     const base = baseUrlOverride !== undefined ? baseUrlOverride : apiBaseUrl;
     // If base is empty, it uses relative path (deployment). If 'http...', it uses absolute (local dev).
     const cleanBase = base.replace(/\/$/, ''); 
     return `${cleanBase}${endpoint}`;
  };

  const fetchData = async (pwd: string, url: string) => {
    setIsLoading(true);
    try {
      const targetUrl = getApiUrl('/api/data', url);
      console.log("Fetching from:", targetUrl);
      
      const res = await fetch(targetUrl, {
        headers: { 'Authorization': `Bearer ${pwd}` }
      });
      
      if (res.status === 401) {
        setIsAuthenticated(false);
        setAuthError('密码错误 (Unauthorized)');
        localStorage.removeItem('auth_password');
      } else if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setLogs(data.logs || []);
        setSettings(data.settings || { dailyPushTime: "09:00" });
        setIsAuthenticated(true);
        localStorage.setItem('auth_password', pwd);
        setAuthError('');
      } else {
        setAuthError(`连接错误: ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setAuthError('无法连接到服务器。请检查 API 地址或网络。');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('api_base_url', apiBaseUrl);
    fetchData(password, apiBaseUrl);
  };

  const syncData = async (newEvents: EventItem[], newLogs: EventLog[], newSettings: AppSettings) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(getApiUrl('/api/data'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({
          events: newEvents,
          logs: newLogs,
          settings: newSettings
        })
      });
      if (!res.ok) alert("保存失败，请重试");
    } catch (e) {
      alert("同步失败，请检查网络");
    }
  };

  const testNotification = async () => {
    const type = prompt("请输入测试渠道 (telegram / bark / pushplus / webhook):", "telegram");
    if(!type) return;
    try {
        const res = await fetch(getApiUrl('/api/test-notify'), {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${password}`
            },
            body: JSON.stringify({ type, settings }) // Send current settings to test immediately
        });
        const data = await res.json();
        alert(data.message);
    } catch(e) {
        alert("测试请求发送失败");
    }
  }

  // --- CRUD Handlers ---
  const handleSaveEvent = () => {
    if (!newEvent.name || !newEvent.date) {
        alert("名称和日期不能为空");
        return;
    }
    
    // Ensure interval is at least 1
    const finalInterval = Math.max(1, Number(newEvent.interval) || 1);
    
    let updatedEvents = [...events];
    const eventData = {
        ...newEvent,
        interval: finalInterval,
        reminderDays: Number(newEvent.reminderDays) || 0
    } as EventItem;

    if (currentEditingEvent) {
      updatedEvents = events.map(e => e.id === currentEditingEvent.id ? { ...eventData, id: e.id, created_at: e.created_at } : e);
    } else {
      updatedEvents = [...events, { ...eventData, id: Date.now().toString(), created_at: Date.now() }];
    }
    setEvents(updatedEvents);
    syncData(updatedEvents, logs, settings);
    closeEventModal();
  };

  const deleteEvent = (id: string) => {
    if(confirm('确定要删除这个项目吗？相关的账本记录也会被删除。')) {
      const updatedEvents = events.filter(e => e.id !== id);
      const updatedLogs = logs.filter(l => l.eventId !== id);
      setEvents(updatedEvents);
      setLogs(updatedLogs);
      syncData(updatedEvents, updatedLogs, settings);
    }
  }

  const handleSaveLog = () => {
    if (!selectedEventForLog || !newLog.title) {
        alert("请输入摘要标题");
        return;
    }
    const logItem: EventLog = {
      id: Date.now().toString(),
      eventId: selectedEventForLog,
      date: newLog.date || new Date().toISOString().split('T')[0],
      title: newLog.title!,
      amount: Number(newLog.amount), // Ensure number
      notes: newLog.notes || '',
      tags: []
    };
    
    // Optimistic update
    const updatedLogs = [logItem, ...logs];
    setLogs(updatedLogs);
    
    // Sync
    syncData(events, updatedLogs, settings);
    
    // Reset form
    setNewLog({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const deleteLog = (id: string) => {
    if(!confirm("删除这条记录？")) return;
    const updatedLogs = logs.filter(l => l.id !== id);
    setLogs(updatedLogs);
    syncData(events, updatedLogs, settings);
  }

  // --- Display Logic ---
  const eventsWithCalculations = useMemo(() => {
    return events.map(evt => {
      const nextDate = getNextDate(evt);
      const daysLeft = getDaysUntil(nextDate);
      
      const eventLogs = logs.filter(l => l.eventId === evt.id);
      const totalCost = eventLogs.reduce((acc, curr) => acc + curr.amount, 0);
      
      // Sort logs desc
      const sortedLogs = [...eventLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastLog = sortedLogs[0];
      const lastSpent = lastLog ? lastLog.amount : 0;
      const lastSpentDate = lastLog ? lastLog.date : null;

      return { ...evt, nextDate, daysLeft, totalCost, lastSpent, lastSpentDate };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [events, logs]);

  const totalSpent = logs.reduce((acc, curr) => acc + curr.amount, 0);

  // --- Modals ---
  const openEditEvent = (evt: EventItem) => {
    setCurrentEditingEvent(evt);
    setNewEvent(evt);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setCurrentEditingEvent(null);
    setNewEvent({ name: '', date: '', calendarType: CalendarType.SOLAR, cycleType: CycleType.YEARLY, interval: 1, reminderDays: 3 });
  };

  // --- Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neo-bg p-4 font-mono">
        <NeoCard className="w-full max-w-md bg-white border-4 p-8">
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 bg-neo-main border-4 border-black flex items-center justify-center font-bold text-4xl shadow-neo animate-bounce">
               M
             </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Memo-Brutal</h1>
          <p className="text-center text-sm text-gray-500 mb-8 font-bold">新丑主义纪念日助手</p>
          
          <div className="space-y-6">
             <NeoInput 
                type="password" 
                label="访问密码 (AUTH_PASSWORD)"
                placeholder="默认为 admin" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
             />

             {/* Advanced Settings Toggle */}
             <div>
                <button 
                    onClick={() => setShowAdvancedLogin(!showAdvancedLogin)} 
                    className="text-xs font-bold underline mb-2 flex items-center gap-1 hover:text-neo-main"
                >
                    <Settings size={12}/> {showAdvancedLogin ? '收起配置' : '服务器配置 (如果是本地开发请点击)'}
                </button>
                
                {showAdvancedLogin && (
                    <div className="bg-gray-100 p-3 border-2 border-black animate-in fade-in slide-in-from-top-2">
                        <NeoInput 
                            label="API Base URL (可选)"
                            placeholder="例如 http://127.0.0.1:8787"
                            value={apiBaseUrl}
                            onChange={(e) => setApiBaseUrl(e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                            * 如果已部署到 Cloudflare，请留空。<br/>
                            * 本地开发请填写 Wrangler 地址。
                        </p>
                    </div>
                )}
             </div>

             {authError && (
                 <div className="bg-red-100 border-2 border-red-500 text-red-600 p-3 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16}/> {authError}
                 </div>
             )}
             
             <NeoButton onClick={handleLogin} className="w-full text-lg py-3" disabled={isLoading}>
                {isLoading ? '连接中...' : '登录 / 连接'}
             </NeoButton>
          </div>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-mono text-neo-dark pb-20">
      
      {/* Navbar */}
      <header className="bg-white border-b-4 border-black p-4 sticky top-0 z-40 shadow-neo-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neo-main border-2 border-black flex items-center justify-center font-bold text-xl shadow-neo-sm">
              M
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tighter uppercase hidden sm:block">Memo-Brutal</h1>
          </div>
          <div className="flex gap-2">
            <NeoButton onClick={() => setIsEventModalOpen(true)} className="px-3" title="新建">
              <Plus size={18} /> <span className="hidden sm:inline">新建</span>
            </NeoButton>
            <NeoButton variant="secondary" onClick={() => setIsSettingsModalOpen(true)} className="px-3" title="设置">
              <Settings size={18} />
            </NeoButton>
            <NeoButton variant="danger" onClick={() => { localStorage.removeItem('auth_password'); setIsAuthenticated(false); }} className="px-3" title="注销">
               <Lock size={18} />
            </NeoButton>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        
        {/* Dashboard Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Next Event */}
           <NeoCard color="bg-neo-accent" className="flex flex-col justify-between h-40">
              <span className="font-bold uppercase text-xs border-b-2 border-black pb-1 mb-2 inline-block w-max">最近提醒</span>
              {eventsWithCalculations[0] ? (
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                   <div className="text-2xl font-bold leading-tight truncate mb-1">{eventsWithCalculations[0].name}</div>
                   <div className="flex items-baseline gap-2">
                       <span className="text-5xl font-bold">{eventsWithCalculations[0].daysLeft}</span>
                       <span className="text-sm font-bold">天后</span>
                   </div>
                   <div className="text-xs font-bold mt-2 opacity-75">{formatDate(eventsWithCalculations[0].nextDate)}</div>
                </div>
              ) : (
                <div className="text-xl font-bold text-gray-500 mt-4">暂无待办事项</div>
              )}
              <Calendar className="absolute bottom-2 right-2 opacity-10 w-24 h-24" />
           </NeoCard>

           {/* Finance */}
           <NeoCard color="bg-neo-success" className="flex flex-col justify-between h-40 text-white relative overflow-hidden">
              <span className="font-bold uppercase text-xs border-b-2 border-white pb-1 mb-2 inline-block w-max">累计总收支</span>
              <div className="flex-1 flex flex-col justify-center z-10">
                  <div className="text-4xl font-bold">{formatCurrency(totalSpent)}</div>
                  <div className="text-xs font-bold opacity-80 mt-2">包含所有项目的历史记录</div>
              </div>
              <DollarSign className="absolute -bottom-6 -right-6 opacity-20 w-32 h-32 text-black" />
           </NeoCard>

           {/* Status */}
           <NeoCard color="bg-white" className="flex flex-col justify-between h-40">
              <span className="font-bold uppercase text-xs border-b-2 border-black pb-1 mb-2 inline-block w-max">监控状态</span>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                    <div className="text-5xl font-bold">{events.length}</div>
                    <span className="text-sm font-bold text-gray-500">个追踪项</span>
                </div>
                <div className="text-xs text-gray-500 font-bold mt-2 bg-gray-100 p-1 inline-block border border-gray-300">
                    推送时间: {settings.dailyPushTime} UTC
                </div>
              </div>
           </NeoCard>
        </section>

        {/* List Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
             <div className="bg-black text-white px-4 py-2 text-lg font-bold shadow-neo-sm transform -rotate-1 inline-block border-2 border-transparent">
               📋 追踪列表
             </div>
             <button onClick={() => fetchData(password, apiBaseUrl)} className="text-sm font-bold flex items-center gap-2 hover:bg-yellow-200 px-3 py-1 transition-colors border-2 border-black bg-white shadow-neo-sm active:shadow-none">
                <RefreshCw size={14} /> 刷新数据
             </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {eventsWithCalculations.map((event) => (
              <div key={event.id} className="relative group">
                {/* Main Event Card */}
                <div className="bg-white border-2 border-black p-0 shadow-neo transition-all hover:-translate-y-1 hover:shadow-neo-lg flex flex-col md:flex-row min-h-[160px]">
                    
                    {/* Left: Countdown */}
                    <div className={`md:w-36 flex-shrink-0 bg-neo-bg border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col items-center justify-center p-4 text-center ${event.daysLeft <= 7 ? 'bg-neo-accent' : ''}`}>
                        <span className="text-[10px] font-bold uppercase mb-1 tracking-wider">倒计时</span>
                        <span className="text-5xl font-bold">{event.daysLeft}</span>
                        <span className="text-xs font-bold uppercase mt-1">天</span>
                    </div>

                    {/* Middle: Details */}
                    <div className="flex-1 p-5 flex flex-col justify-between relative">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <h3 className="text-xl font-bold">{event.name}</h3>
                                <NeoBadge color="bg-white">{event.calendarType === CalendarType.LUNAR ? '🌙 农历' : '☀️ 公历'}</NeoBadge>
                                <NeoBadge color="bg-blue-200">
                                    {event.cycleType === CycleType.ONCE ? '一次性' : 
                                     `每 ${event.interval} ${event.cycleType === CycleType.YEARLY ? '年' : event.cycleType === CycleType.MONTHLY ? '月' : event.cycleType === CycleType.WEEKLY ? '周' : '天'}`}
                                </NeoBadge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-1">
                                <span className="w-2 h-2 bg-neo-main rounded-full border border-black"></span>
                                下个目标日: {formatDate(event.nextDate)}
                            </div>
                            
                            {event.description && (
                                <div className="text-xs text-gray-500 mt-2 pl-4 border-l-2 border-gray-300 italic max-w-lg">
                                    "{event.description}"
                                </div>
                            )}
                        </div>

                        {/* Financial Snapshot */}
                        <div className="flex gap-8 mt-5 pt-3 border-t-2 border-gray-100">
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">上次花费 ({event.lastSpentDate || '-'})</div>
                                <div className={`font-bold text-base ${event.lastSpent < 0 ? 'text-red-600' : event.lastSpent > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {event.lastSpent !== 0 ? formatCurrency(event.lastSpent) : '-'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">累计总额</div>
                                <div className={`font-bold text-base ${event.totalCost < 0 ? 'text-red-600' : event.totalCost > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                    {formatCurrency(event.totalCost)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions Toolbar */}
                    <div className="bg-gray-50 p-3 border-t-2 md:border-t-0 md:border-l-2 border-black flex md:flex-col items-center justify-center gap-3">
                        <button 
                            onClick={() => { setSelectedEventForLog(event.id); setIsLogModalOpen(true); }} 
                            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black hover:bg-neo-main shadow-neo-sm active:translate-y-0.5 active:shadow-none transition-all group-hover:scale-110" 
                            title="记账/日志"
                        >
                            <BookOpen size={18} />
                        </button>
                        <button 
                            onClick={() => openEditEvent(event)} 
                            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black hover:bg-yellow-200 shadow-neo-sm active:translate-y-0.5 active:shadow-none transition-all" 
                            title="编辑"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => deleteEvent(event.id)} 
                            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black hover:bg-red-500 hover:text-white shadow-neo-sm active:translate-y-0.5 active:shadow-none transition-all" 
                            title="删除"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
              </div>
            ))}
            
            {events.length === 0 && (
                <div className="text-center py-20 border-4 border-dashed border-gray-300 rounded bg-gray-50 flex flex-col items-center">
                    <div className="text-4xl mb-4 grayscale opacity-50">📬</div>
                    <div className="text-gray-500 font-bold text-lg">暂无数据</div>
                    <p className="text-sm text-gray-400 mt-2">点击右上角的 "新建" 按钮添加您的第一个纪念日或订阅。</p>
                </div>
            )}
          </div>
        </section>
      </main>

      {/* --- Modals --- */}

      {/* Event Modal */}
      <NeoModal isOpen={isEventModalOpen} onClose={closeEventModal} title={currentEditingEvent ? "编辑事项" : "新建事项"}>
         <div className="space-y-6">
            <NeoInput 
              label="事项名称" 
              placeholder="例如：服务器续费、老妈生日" 
              value={newEvent.name} 
              onChange={e => setNewEvent({...newEvent, name: e.target.value})} 
            />
            <NeoInput 
              label="起始日期 (基准日)" 
              type="date"
              value={newEvent.date} 
              onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
            />
            
            <div className="grid grid-cols-2 gap-4">
               <NeoSelect 
                label="历法类型"
                value={newEvent.calendarType} 
                onChange={e => setNewEvent({...newEvent, calendarType: e.target.value as CalendarType})}
              >
                <option value={CalendarType.SOLAR}>公历 (阳历)</option>
                <option value={CalendarType.LUNAR}>农历 (阴历)</option>
              </NeoSelect>

              <NeoSelect 
                label="循环单位"
                value={newEvent.cycleType} 
                onChange={e => setNewEvent({...newEvent, cycleType: e.target.value as CycleType})}
              >
                <option value={CycleType.YEARLY}>年 (Years)</option>
                <option value={CycleType.MONTHLY}>月 (Months)</option>
                <option value={CycleType.WEEKLY}>周 (Weeks)</option>
                <option value={CycleType.DAILY}>天 (Days)</option>
                <option value={CycleType.ONCE}>不循环 (Once)</option>
              </NeoSelect>
            </div>

            {/* Interval Setting */}
            {newEvent.cycleType !== CycleType.ONCE && (
                <div className="bg-blue-50 p-4 border-2 border-black flex items-center gap-4">
                    <div className="flex-1">
                         <NeoInput 
                            label={`每多少${newEvent.cycleType === CycleType.YEARLY ? '年' : newEvent.cycleType === CycleType.MONTHLY ? '月' : newEvent.cycleType === CycleType.WEEKLY ? '周' : '天'}重复一次？`}
                            type="number" 
                            min={1}
                            className="mb-0"
                            value={newEvent.interval} 
                            onChange={e => setNewEvent({...newEvent, interval: parseInt(e.target.value)})} 
                        />
                    </div>
                    <div className="text-xs font-bold bg-white border-2 border-black p-2 shadow-neo-sm h-fit self-end mb-1">
                        预览：每 {newEvent.interval} {newEvent.cycleType}
                    </div>
                </div>
            )}
            
            <NeoInput 
              label="提前提醒天数" 
              type="number" 
              min={0}
              value={newEvent.reminderDays} 
              onChange={e => setNewEvent({...newEvent, reminderDays: parseInt(e.target.value)})} 
            />
             <NeoInput 
              label="备注 (可选)" 
              placeholder="写点什么..."
              value={newEvent.description || ''} 
              onChange={e => setNewEvent({...newEvent, description: e.target.value})} 
            />
            
            <div className="pt-4 flex justify-end gap-3 border-t-2 border-gray-100">
              <NeoButton variant="secondary" onClick={closeEventModal}>取消</NeoButton>
              <NeoButton onClick={handleSaveEvent}>
                {currentEditingEvent ? <Save size={16}/> : <Plus size={16}/>} 
                {currentEditingEvent ? '保存更新' : '立即创建'}
              </NeoButton>
            </div>
         </div>
      </NeoModal>

      {/* Settings Modal */}
      <NeoModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="系统设置 & 推送">
         <div className="space-y-6">
            <div className="p-3 bg-yellow-50 border-2 border-black text-sm font-bold flex gap-2">
               <Link2 size={16} className="flex-shrink-0 mt-0.5"/>
               <div>
                  <p>当前 API 地址: {getApiUrl('')}</p>
                  <p className="text-xs font-normal text-gray-600 mt-1">如需更改，请重新登录。</p>
               </div>
            </div>

            <NeoInput label="每日检查时间 (UTC)" type="time" value={settings.dailyPushTime} onChange={(e) => setSettings({...settings, dailyPushTime: e.target.value})} />
            
            <div className="border-t-4 border-black pt-4">
              <h4 className="font-bold mb-4 bg-black text-white inline-block px-3 py-1 transform -rotate-1 shadow-neo-sm border-2 border-transparent">
                  📢 通知渠道配置
              </h4>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Telegram */}
                  <div className="bg-gray-50 p-4 border-2 border-gray-200 focus-within:border-black focus-within:bg-white transition-all">
                      <h5 className="font-bold text-sm mb-3 flex items-center gap-2">Telegram Bot</h5>
                      <div className="space-y-3">
                        <NeoInput placeholder="Bot Token (e.g. 123456:ABC-DEF...)" value={settings.telegramBotToken || ''} onChange={e => setSettings({...settings, telegramBotToken: e.target.value})} className="mb-0" />
                        <NeoInput placeholder="Chat ID (e.g. 12345678)" value={settings.telegramChatId || ''} onChange={e => setSettings({...settings, telegramChatId: e.target.value})} className="mb-0" />
                      </div>
                  </div>

                  {/* Bark */}
                  <div className="bg-gray-50 p-4 border-2 border-gray-200 focus-within:border-black focus-within:bg-white transition-all">
                      <h5 className="font-bold text-sm mb-3">Bark (iOS)</h5>
                      <NeoInput placeholder="Bark URL Key" value={settings.barkKey || ''} onChange={e => setSettings({...settings, barkKey: e.target.value})} className="mb-0" />
                  </div>

                  {/* PushPlus */}
                  <div className="bg-gray-50 p-4 border-2 border-gray-200 focus-within:border-black focus-within:bg-white transition-all">
                      <h5 className="font-bold text-sm mb-3">PushPlus</h5>
                      <NeoInput placeholder="Token" value={settings.pushPlusToken || ''} onChange={e => setSettings({...settings, pushPlusToken: e.target.value})} className="mb-0" />
                  </div>

                  {/* Webhook */}
                  <div className="bg-gray-50 p-4 border-2 border-gray-200 focus-within:border-black focus-within:bg-white transition-all">
                      <h5 className="font-bold text-sm mb-3">Webhook</h5>
                      <NeoInput placeholder="https://your-webhook.com" value={settings.webhookUrl || ''} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} className="mb-0" />
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-gray-100">
                <NeoButton variant="secondary" onClick={testNotification} className="w-full bg-yellow-100 hover:bg-yellow-300">
                    <Send size={16}/> 测试连接
                </NeoButton>
                <NeoButton onClick={() => { syncData(events, logs, settings); setIsSettingsModalOpen(false); }} className="w-full">
                    <Save size={16}/> 保存配置
                </NeoButton>
            </div>
         </div>
      </NeoModal>

      {/* Log/Ledger Modal */}
      <NeoModal isOpen={isLogModalOpen} onClose={() => {setIsLogModalOpen(false); setSelectedEventForLog(null)}} title="记账 & 日志">
        <div className="flex flex-col h-[70vh]">
           {/* Add New Log Form */}
           <div className="bg-neo-bg border-b-4 border-black p-4 mb-4 flex-shrink-0">
              <h4 className="font-bold text-sm uppercase mb-3 flex items-center gap-2 text-neo-main bg-black px-2 py-1 w-max border-2 border-transparent">
                  <Plus size={16}/> 添加新记录
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                 <div className="md:col-span-1">
                    <NeoInput type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="bg-white mb-0" />
                 </div>
                 <div className="md:col-span-2">
                    <NeoInput placeholder="摘要 (例如: 购买礼物)" value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} className="bg-white mb-0" />
                 </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                  <div className="font-bold text-xl px-3 py-3 bg-black text-white border-2 border-black flex items-center h-[52px]">¥</div>
                  <NeoInput type="number" placeholder="金额 (负数=支出，正数=收入)" value={newLog.amount === 0 ? '' : newLog.amount} onChange={e => setNewLog({...newLog, amount: Number(e.target.value)})} className="bg-white font-bold text-lg mb-0" />
              </div>
              <textarea 
                className="w-full border-2 border-black p-3 font-mono text-sm mb-3 h-20 outline-none focus:shadow-neo transition-all resize-none font-bold" 
                placeholder="详细备注 (选填)..." 
                value={newLog.notes} 
                onChange={e => setNewLog({...newLog, notes: e.target.value})} 
              />
              <NeoButton onClick={handleSaveLog} className="w-full text-sm py-3">确认添加记录</NeoButton>
           </div>

           {/* History List */}
           <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {logs.filter(l => l.eventId === selectedEventForLog).length === 0 && (
                <div className="text-center text-gray-400 font-bold py-10 flex flex-col items-center">
                    <BookOpen size={48} className="mb-4 opacity-10"/>
                    暂无记录，请在上方添加
                </div>
              )}
              {logs.filter(l => l.eventId === selectedEventForLog)
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
               .map(log => (
                 <div key={log.id} className="border-2 border-black p-3 bg-white flex justify-between items-start shadow-sm hover:shadow-neo hover:-translate-y-1 transition-all group">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                           <span className="bg-gray-100 text-[10px] font-bold px-2 py-0.5 border border-black">{log.date}</span>
                           <span className="font-bold text-sm">{log.title}</span>
                       </div>
                       <div className="text-xs text-gray-500 break-all font-bold opacity-70">{log.notes}</div>
                    </div>
                    <div className="text-right pl-4 flex flex-col items-end min-w-[80px]">
                       <div className={`font-bold text-lg ${log.amount > 0 ? 'text-neo-success' : log.amount < 0 ? 'text-neo-danger' : 'text-gray-400'}`}>
                         {formatCurrency(log.amount)}
                       </div>
                       <button onClick={() => deleteLog(log.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 underline mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={10}/> 删除
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </NeoModal>

    </div>
  );
}