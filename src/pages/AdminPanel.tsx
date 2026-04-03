import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { Employee, Lead, AnalyticsEvent, UserProfile } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  BarChart3, 
  MessageSquare, 
  Trash2, 
  ExternalLink, 
  ChevronRight, 
  Search, 
  Filter, 
  Download,
  ArrowLeft,
  Settings,
  Eye,
  MousePointer2,
  Share2,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  TrendingUp,
  Calendar,
  FileDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

import { toast } from 'sonner';

const AdminPanel = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'leads' | 'analytics'>('employees');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, leadsRes, analyticsRes] = await Promise.all([
          supabase.from('employees').select('*'),
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
          supabase.from('analytics').select('*').order('created_at', { ascending: false })
        ]);

        if (empRes.data) setEmployees(empRes.data as Employee[]);
        if (leadsRes.data) setLeads(leadsRes.data.map(l => ({ ...l, timestamp: l.created_at })) as any);
        if (analyticsRes.data) setAnalytics(analyticsRes.data.map(a => ({ ...a, timestamp: a.created_at })) as any);
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Optional: Real-time subscriptions
    const empSub = supabase.channel('employees-all').on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetchData).subscribe();
    const leadsSub = supabase.channel('leads-all').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchData).subscribe();
    const analyticsSub = supabase.channel('analytics-all').on('postgres_changes', { event: '*', schema: 'public', table: 'analytics' }, fetchData).subscribe();

    return () => {
      empSub.unsubscribe();
      leadsSub.unsubscribe();
      analyticsSub.unsubscribe();
    };
  }, []);

  const stats = {
    totalViews: analytics.filter(e => e.event_type === 'view').length,
    totalClicks: analytics.filter(e => e.event_type === 'click').length,
    totalShares: analytics.filter(e => e.event_type === 'share').length,
    totalLeads: leads.length
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployeeStatus = async (id: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    try {
      const { error } = await supabase.from('employees').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      // fetchData will be called by subscription
    } catch (err: any) {
      console.error("Error updating status:", err);
      toast.error(err.message || "Failed to update status");
    }
  };

  const exportLeadsToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Message', 'Employee', 'Date'];
    const rows = leads.map(l => [
      l.name,
      l.email,
      l.phone,
      l.message.replace(/,/g, ';'),
      employees.find(e => e.id === l.employee_id)?.name || 'Unknown',
      new Date(l.timestamp).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getChartData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
    return last7Days.map(date => {
      const dayViews = analytics.filter(e => 
        e.event_type === 'view' && 
        e.timestamp && 
        isSameDay(new Date(e.timestamp), date)
      ).length;
      const dayClicks = analytics.filter(e => 
        e.event_type === 'click' && 
        e.timestamp && 
        isSameDay(new Date(e.timestamp), date)
      ).length;
      return {
        date: format(date, 'MMM dd'),
        views: dayViews,
        clicks: dayClicks
      };
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-bottom border-neutral-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-neutral-100 rounded-xl transition-all">
              <ArrowLeft size={20} className="text-neutral-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Admin Panel</h1>
              <p className="text-xs text-neutral-400">Galaxy Toyota Platform Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-neutral-900">{profile?.email}</p>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">System Administrator</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Eye className="text-blue-600" />} label="Total Views" value={stats.totalViews} color="bg-blue-50" />
          <StatCard icon={<MousePointer2 className="text-purple-600" />} label="Total Clicks" value={stats.totalClicks} color="bg-purple-50" />
          <StatCard icon={<Share2 className="text-orange-600" />} label="Total Shares" value={stats.totalShares} color="bg-orange-50" />
          <StatCard icon={<MessageSquare className="text-green-600" />} label="Total Leads" value={stats.totalLeads} color="bg-green-50" />
        </div>

        {/* Tabs & Search */}
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2 p-1 bg-neutral-50 rounded-2xl w-fit">
              <TabButton active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} label="Employees" count={employees.length} />
              <TabButton active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} label="Leads" count={leads.length} />
              <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Analytics" />
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'leads' && (
                <button 
                  onClick={exportLeadsToCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200"
                >
                  <FileDown size={18} />
                  Export CSV
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-11 pr-4 text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-0">
            {activeTab === 'employees' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/50">
                      <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Employee</th>
                      <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Designation</th>
                      <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200">
                              {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2 text-neutral-300" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900">{emp.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-neutral-400 font-mono">/{emp.slug}</p>
                                <span className={cn(
                                  "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest",
                                  emp.status === 'inactive' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                                )}>
                                  {emp.status || 'active'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-neutral-600">{emp.designation || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs space-y-1">
                            <p className="text-neutral-600">{emp.email}</p>
                            <p className="text-neutral-400">{emp.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => toggleEmployeeStatus(emp.id, emp.status)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                emp.status === 'inactive' ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50"
                              )}
                              title={emp.status === 'inactive' ? "Activate" : "Deactivate"}
                            >
                              {emp.status === 'inactive' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            </button>
                            <a href={`/card/${emp.slug}`} target="_blank" className="p-2 text-neutral-400 hover:text-blue-600 transition-all"><ExternalLink size={18} /></a>
                            <button 
                              onClick={async () => {
                                toast.warning('Are you sure you want to delete this employee?', {
                                  action: {
                                    label: 'Delete',
                                    onClick: async () => {
                                      const { error } = await supabase.from('employees').delete().eq('id', emp.id);
                                      if (error) toast.error(error.message);
                                      else toast.success('Employee deleted');
                                    }
                                  }
                                });
                              }} 
                              className="p-2 text-neutral-400 hover:text-red-600 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="p-6 grid gap-4">
                {leads.map(lead => (
                  <div key={lead.id} className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-neutral-900">{lead.name}</h4>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">New Lead</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-4">{lead.message}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-neutral-400">
                        <span className="flex items-center gap-1"><Mail size={12} /> {lead.email}</span>
                        <span className="flex items-center gap-1"><Phone size={12} /> {lead.phone}</span>
                        <span className="flex items-center gap-1"><UserCheck size={12} /> For: {employees.find(e => e.id === lead.employee_id)?.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-neutral-400 mb-2">{new Date(lead.timestamp).toLocaleString()}</p>
                      <button 
                        onClick={async () => {
                          const { error } = await supabase.from('leads').delete().eq('id', lead.id);
                          if (error) toast.error(error.message);
                          else toast.success('Lead deleted');
                        }} 
                        className="p-2 text-neutral-400 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="lg:col-span-2 bg-neutral-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-neutral-200 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <TrendingUp size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-bold">Engagement Overview</h3>
                          <p className="text-xs text-neutral-400 mt-1">Last 7 days performance</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Views</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span>Clicks</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getChartData()}>
                            <defs>
                              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#ffffff40" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              stroke="#ffffff40" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#171717', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
                            <Area type="monotone" dataKey="clicks" stroke="#a855f7" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm">
                      <h4 className="text-sm font-bold text-neutral-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-600" />
                        Top Performers
                      </h4>
                      <div className="space-y-4">
                        {employees.slice(0, 3).map((emp, i) => {
                          const empViews = analytics.filter(e => e.employee_id === emp.id && e.event_type === 'view').length;
                          return (
                            <div key={emp.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </div>
                                <p className="text-sm font-medium text-neutral-700">{emp.name}</p>
                              </div>
                              <p className="text-sm font-bold text-neutral-900">{empViews}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100">
                      <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Conversion Rate</p>
                      <h3 className="text-4xl font-bold mb-4">
                        {stats.totalViews > 0 ? ((stats.totalLeads / stats.totalViews) * 100).toFixed(1) : 0}%
                      </h3>
                      <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-white h-full rounded-full" 
                          style={{ width: `${stats.totalViews > 0 ? (stats.totalLeads / stats.totalViews) * 100 : 0}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm">
                  <h3 className="text-lg font-bold mb-6">Recent Activity Stream</h3>
                  <div className="space-y-4">
                    {analytics.slice(0, 10).map(event => (
                      <div key={event.id} className="flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            event.event_type === 'view' ? "bg-blue-50 text-blue-600" : 
                            event.event_type === 'click' ? "bg-purple-50 text-purple-500" : "bg-orange-50 text-orange-500"
                          )}>
                            {event.event_type === 'view' ? <Eye size={18} /> : 
                             event.event_type === 'click' ? <MousePointer2 size={18} /> : <Share2 size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-neutral-900">
                              {event.event_type.toUpperCase()} on {employees.find(e => e.id === event.employee_id)?.name || 'Unknown'}'s Card
                            </p>
                            <p className="text-[10px] text-neutral-400">{event.metadata?.button ? `Button: ${event.metadata.button}` : 'Direct View'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-neutral-900">{format(new Date(event.timestamp), 'HH:mm')}</p>
                          <p className="text-[10px] text-neutral-400">{format(new Date(event.timestamp), 'MMM dd')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", color)}>
      {icon}
    </div>
    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-bold text-neutral-900 tracking-tight">{value.toLocaleString()}</p>
  </div>
);

const TabButton = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
      active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
    )}
  >
    {label}
    {count !== undefined && (
      <span className={cn(
        "text-[10px] px-1.5 py-0.5 rounded-md",
        active ? "bg-neutral-100 text-neutral-600" : "bg-neutral-200 text-neutral-400"
      )}>
        {count}
      </span>
    )}
  </button>
);

export default AdminPanel;
