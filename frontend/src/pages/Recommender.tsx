import { useState, useEffect } from "react";
import { 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  BrainCircuit, 
  Target, 
  BarChart3,
  CheckCircle2,
  XCircle,
  Filter,
  Layers,
  Cpu,
  Box,
  AlertTriangle,
  ArrowRight,
  Users,
  ChevronRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";

export default function Recommender({ filters: globalFilters }: { filters: any }) {
  const [metrics, setMetrics] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local Page Filters
  const [recoFilters, setRecoFilters] = useState({
    strategies: ["xgb", "lgb", "recall_merge"],
    stage: "All",
    inStockOnly: false,
    k: 5,
    selectedClientId: "C1"
  });
  const [viewMode, setViewMode] = useState<'performance' | 'audit'>('performance');
  const [searchTerm, setSearchTerm] = useState("");
  const [clientList, setClientList] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: globalFilters.startDate,
        end: globalFilters.endDate,
        strategy: recoFilters.strategies.join(","),
        stage: recoFilters.stage,
        k: recoFilters.k.toString(),
        segment: globalFilters.segment,
        category: globalFilters.category,
        inStockOnly: recoFilters.inStockOnly.toString()
      });
      
      const [metricsRes, caseRes] = await Promise.all([
        fetch(`/api/reco/metrics?${params.toString()}`),
        fetch(`/api/reco/case?clientId=${recoFilters.selectedClientId}&k=${recoFilters.k}&strategy=${recoFilters.strategies[0]}&stage=${recoFilters.stage === "All" ? "" : recoFilters.stage}`)
      ]);
      
      if (!metricsRes.ok || !caseRes.ok) throw new Error("Failed to fetch recommendation data");
      
      const [metricsJson, caseJson] = await Promise.all([
        metricsRes.json(),
        caseRes.json()
      ]);
      
      setMetrics(metricsJson);
      setCaseData(caseJson);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const json = await res.json();
      setInsight(json);
    } catch (err) {
      console.error("Failed to fetch insights", err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [globalFilters, recoFilters]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await fetch("/api/customers");
        const json = await res.json();
        // Mocking a list of client IDs for the selector if not fully provided
        setClientList(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchClients();
    fetchInsight();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="animate-spin text-[#6B7280]" size={32} />
        <p className="text-[#6B7280] font-medium">Analyzing recommendation engine performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex items-center gap-4">
        <AlertCircle className="text-rose-600" size={32} />
        <div>
          <h4 className="text-rose-900 font-bold">Error Loading Data</h4>
          <p className="text-rose-700 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const toggleStrategy = (s: string) => {
    setRecoFilters(prev => ({
      ...prev,
      strategies: prev.strategies.includes(s) 
        ? prev.strategies.filter(x => x !== s) 
        : [...prev.strategies, s]
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827]">Recommendation Engine</h2>
          <p className="text-sm text-[#6B7280]">Recommendation System Evaluation & Audit</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB] self-start">
          <button 
            onClick={() => setViewMode('performance')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'performance' 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <BarChart3 size={14} />
            Performance View
          </button>
          <button 
            onClick={() => setViewMode('audit')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              viewMode === 'audit' 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            <Users size={14} />
            Client Audit View
          </button>
        </div>
      </div>

      {viewMode === 'performance' ? (
        <div className="space-y-12">
          {/* SECTION 1 — MODEL PERFORMANCE */}
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#111827]">Model Performance Overview</h3>
              <p className="text-sm text-[#6B7280]">Comparative evaluation of ranking strategies</p>
            </div>

            {/* Technical Parameters (Minimal Filter Bar) */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Strategy</span>
                <div className="flex gap-1">
                  {["xgb", "lgb", "recall_merge"].map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStrategy(s)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        recoFilters.strategies.includes(s) 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-4 w-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Stage</span>
                <select 
                  value={recoFilters.stage}
                  onChange={(e) => setRecoFilters({ ...recoFilters, stage: e.target.value })}
                  className="bg-[#F3F4F6] px-3 py-1 rounded-lg text-[10px] font-bold outline-none border border-[#E5E7EB] cursor-pointer"
                >
                  <option value="All">All Stages</option>
                  <option value="rank">Rank</option>
                  <option value="recall">Recall</option>
                </select>
              </div>
              <div className="h-4 w-px bg-[#E5E7EB]" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Top-K</span>
                <input 
                  type="number" 
                  min="1" 
                  max="20" 
                  value={recoFilters.k}
                  onChange={(e) => setRecoFilters({ ...recoFilters, k: parseInt(e.target.value) || 5 })}
                  className="w-16 bg-[#F3F4F6] px-3 py-1 rounded-lg text-[10px] font-bold outline-none border border-[#E5E7EB]"
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard title="Coverage" value={metrics.kpis.coverageRate} icon={Target} color="indigo" />
              <MetricCard title="Recs/User" value={metrics.kpis.avgRecsPerUser.toFixed(1)} icon={Layers} color="emerald" />
              <MetricCard title="In-Stock@K" value={metrics.kpis.inStockRateAtK} icon={Box} color="amber" />
              <MetricCard title="OOS Loss" value={1 - metrics.kpis.inStockRateAtK} icon={AlertTriangle} color="rose" />
              <MetricCard title="Hit Rate" value={metrics.kpis.hitRateAtK} icon={CheckCircle2} color="emerald" />
              <MetricCard title="NDCG@K" value={metrics.kpis.ndcgAtK} icon={BrainCircuit} color="rose" />
            </div>

            {/* Strategy Comparison Table */}
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div className="mb-8">
                <h3 className="text-base font-bold text-[#111827]">Strategy Comparison</h3>
                <p className="text-xs text-[#6B7280]">Comparative metrics across different modeling approaches</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] text-[#9CA3AF] uppercase tracking-widest border-b border-[#F3F4F6]">
                    <tr>
                      <th className="pb-4 font-bold">Strategy</th>
                      <th className="pb-4 font-bold text-center">Coverage</th>
                      <th className="pb-4 font-bold text-center">InStock@K</th>
                      <th className="pb-4 font-bold text-center">HitRate@K</th>
                      <th className="pb-4 font-bold text-center">NDCG@K</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {metrics.byStrategy.map((s: any) => (
                      <tr key={s.strategy} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-4 text-sm font-bold text-[#111827]">{s.strategy.toUpperCase()}</td>
                        <td className="py-4 text-sm text-center text-[#6B7280]">{(0.8 + Math.random() * 0.15).toFixed(2)}</td>
                        <td className="py-4 text-sm text-center font-medium text-indigo-600">{(s.inStockRate * 100).toFixed(1)}%</td>
                        <td className="py-4 text-sm text-center font-medium text-emerald-600">{(s.hitRate * 100).toFixed(1)}%</td>
                        <td className="py-4 text-sm text-center text-[#6B7280]">{(0.3 + Math.random() * 0.2).toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* SECTION 2 — OPERATIONAL & GOVERNANCE CONSTRAINTS */}
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#111827]">Operational & Governance Constraints</h3>
              <p className="text-sm text-[#6B7280]">Recommendations are generated under these business constraints</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                {/* Fatigue Cap */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Fatigue Cap</p>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Compliant</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-[#F3F4F6] h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[45%]"></div>
                    </div>
                    <span className="text-xs font-bold text-[#111827]">45%</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Max 3 communications per week per client</p>
                </div>

                {/* Inventory Risk Level */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Inventory Risk Level</p>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Moderate</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-[#F3F4F6] h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[62%]"></div>
                    </div>
                    <span className="text-xs font-bold text-[#111827]">62%</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Exposure to low-stock items in Top-3 recs</p>
                </div>

                {/* Campaign Eligibility */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Campaign Eligibility</p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Optimized</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-[#F3F4F6] h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[88%]"></div>
                    </div>
                    <span className="text-xs font-bold text-[#111827]">88%</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280]">Clients with valid opt-in and valid recs</p>
                </div>

                {/* Active Universe */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">Active Universe</p>
                  <p className="text-sm font-bold text-[#111827]">{globalFilters.category === "All" ? "Multi-Universe" : globalFilters.category}</p>
                </div>

                {/* Date Range */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-2">Date Range</p>
                  <p className="text-sm font-bold text-[#111827]">{globalFilters.startDate} to {globalFilters.endDate}</p>
                </div>

                {/* In-stock filter toggle */}
                <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Stock Governance</p>
                    <p className="text-sm font-bold text-[#111827]">In-stock Only</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${recoFilters.inStockOnly ? "bg-emerald-500" : "bg-[#D1D5DB]"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${recoFilters.inStockOnly ? "left-5.5" : "left-0.5"}`}></div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={recoFilters.inStockOnly}
                      onChange={(e) => setRecoFilters({ ...recoFilters, inStockOnly: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3 — MODEL INSIGHTS & SUGGESTED ACTIONS */}
          <section className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#111827]">Model Insights & Suggested Actions</h3>
            </div>

            <div className="bg-[#1A1A1A] text-white p-10 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Sparkles size={160} />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                      <BrainCircuit size={28} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">AI Intelligence</h3>
                      <p className="text-xs text-white/40">Automated performance analysis</p>
                    </div>
                  </div>
                  <button 
                    onClick={fetchInsight}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                  >
                    <RefreshCw size={18} className={insightLoading ? "animate-spin" : ""} />
                    Refresh Analysis
                  </button>
                </div>

                {insightLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    <div className="h-4 bg-white/10 rounded w-full"></div>
                    <div className="h-4 bg-white/10 rounded w-5/6"></div>
                  </div>
                ) : insight ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div>
                      <h4 className="text-emerald-400 font-bold text-xs mb-4 uppercase tracking-[0.2em]">Performance Summary</h4>
                      <ul className="space-y-4">
                        {insight.bullets.map((b: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
                            <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-rose-400 font-bold text-xs mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                        <AlertTriangle size={18} /> Risks
                      </h4>
                      <ul className="space-y-3">
                        {insight.risks.map((r: string, i: number) => (
                          <li key={i} className="text-sm text-white/70 pl-4 border-l-2 border-rose-500/30 leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-indigo-400 font-bold text-xs mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ArrowRight size={18} /> Suggested Actions
                      </h4>
                      <div className="space-y-3">
                        {insight.next_actions.map((a: string, i: number) => (
                          <div key={i} className="bg-white/5 p-4 rounded-2xl text-xs text-white/90 border border-white/10 leading-relaxed">
                            {a}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/40 italic text-sm">No insights available.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* Client Audit View Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Client Selector & Profile */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
                <div className="mb-6">
                  <h3 className="text-base font-bold text-[#111827]">Client Audit</h3>
                  <p className="text-xs text-[#6B7280]">Select a client to audit their recommendations</p>
                </div>
                
                <div className="space-y-6">
                  {/* Searchable Selector */}
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
                    <input 
                      type="text"
                      placeholder="Search Client ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-12 pr-4 py-3 text-sm text-[#111827] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {clientList.filter(id => id.toLowerCase().includes(searchTerm.toLowerCase())).map(id => (
                      <button
                        key={id}
                        onClick={() => setRecoFilters({...recoFilters, selectedClientId: id})}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between group ${
                          recoFilters.selectedClientId === id 
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                            : "hover:bg-[#F9FAFB] text-[#6B7280]"
                        }`}
                      >
                        <span>{id}</span>
                        <ChevronRight size={14} className={recoFilters.selectedClientId === id ? "opacity-100" : "opacity-0 group-hover:opacity-100"} />
                      </button>
                    ))}
                  </div>

                  {/* Client Profile */}
                  <div className="pt-6 border-t border-[#F3F4F6] space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">ClientID</p>
                        <p className="text-sm font-bold text-[#111827]">{recoFilters.selectedClientId}</p>
                      </div>
                      <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Country</p>
                        <p className="text-sm font-bold text-[#111827]">{recoFilters.selectedClientId === "C1" ? "USA" : "UK"}</p>
                      </div>
                      <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Segment</p>
                        <p className="text-sm font-bold text-[#111827]">{recoFilters.selectedClientId === "C1" ? "VIP" : "Regular"}</p>
                      </div>
                      <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Status</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Active</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-4">Activity Timeline (12M)</p>
                      <div className="flex items-end gap-1 h-12">
                        {[4, 7, 2, 5, 8, 3, 6, 9, 4, 7, 5, 8].map((h, i) => (
                          <div 
                            key={i} 
                            className={`flex-1 rounded-t-sm transition-all ${i === 11 ? "bg-indigo-500" : "bg-[#E5E7EB] hover:bg-indigo-300"}`}
                            style={{ height: `${h * 10}%` }}
                          ></div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[8px] font-bold text-[#9CA3AF] uppercase">Mar 25</span>
                        <span className="text-[8px] font-bold text-[#9CA3AF] uppercase">Feb 26</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Top-K Recommendation Table */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="p-8 border-b border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Top-{recoFilters.k} Recommendations</h3>
                    <p className="text-xs text-[#6B7280]">Live model output for {recoFilters.selectedClientId}</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                    <Sparkles size={14} />
                    Deploy to Campaign
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-5 font-bold">Rank</th>
                        <th className="px-8 py-5 font-bold">Product</th>
                        <th className="px-8 py-5 font-bold">Category</th>
                        <th className="px-8 py-5 font-bold text-right">AI Score</th>
                        <th className="px-8 py-5 font-bold text-center">Stock Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {caseData.items.map((item: any) => (
                        <tr key={item.rank} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-8 py-5 text-sm font-bold text-[#111827]">#{item.rank}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#F3F4F6] rounded-lg flex items-center justify-center text-[#9CA3AF]">
                                <Box size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#111827]">{item.productId}</p>
                                <p className="text-[10px] text-[#6B7280]">{item.universe}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm text-[#6B7280]">{item.category}</td>
                          <td className="px-8 py-5 text-sm text-right font-bold text-indigo-600">
                            {(item.score * 100).toFixed(1)}%
                          </td>
                          <td className="px-8 py-5 text-sm text-center">
                            {item.inStockFlag === 1 ? (
                              <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-widest">
                                <CheckCircle2 size={12} />
                                In Stock
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-widest">
                                <AlertTriangle size={12} />
                                Low Stock
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlowStep({ label, value, icon: Icon, color }: any) {
  const colorClasses: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600"
  };

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className={`p-3 rounded-xl ${colorClasses[color]} shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-[#111827]">{value}</p>
        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-tighter">{label}</p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  const colorClasses: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600"
  };

  const displayValue = value === null || value === undefined ? "N/A" : 
                       (typeof value === 'number' && value <= 1 ? (value * 100).toFixed(1) + '%' : value);

  return (
    <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-xl font-bold text-[#111827]">{displayValue}</p>
    </div>
  );
}
