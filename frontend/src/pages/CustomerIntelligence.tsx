import { useState, useEffect } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  RefreshCw, 
  AlertCircle, 
  Mail, 
  Phone, 
  Users, 
  Activity,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Send,
  Wand2,
  CheckCircle2
} from "lucide-react";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function CustomerIntelligence({ filters }: { filters: any }) {
  const [customerData, setCustomerData] = useState<any>(null);
  const [edaData, setEdaData] = useState<any>({
    purchaseFreq: null,
    monthlySales: null
  });
  const [segmentationData, setSegmentationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retention Assistant State
  const [assistantInputs, setAssistantInputs] = useState({
    segment: "VIP",
    category: "Electronics",
    season: "Spring",
    sensitivity: "Medium"
  });
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const custParams = new URLSearchParams({
        start: filters.startDate,
        end: filters.endDate,
        country: filters.country,
        segment: filters.segment
      });

      const [custRes, freqRes, monthRes, segRes] = await Promise.all([
        fetch(`/api/customers?${custParams.toString()}`),
        fetch("/api/intelligence/eda/purchase-freq"),
        fetch("/api/intelligence/eda/monthly-sales"),
        fetch("/api/intelligence/segmentation")
      ]);

      if (!custRes.ok || !freqRes.ok || !monthRes.ok || !segRes.ok) {
        throw new Error("Failed to fetch customer intelligence data");
      }
      
      const [custJson, freqJson, monthJson, segJson] = await Promise.all([
        custRes.json(),
        freqRes.json(),
        monthRes.json(),
        segRes.json()
      ]);

      setCustomerData(custJson);
      setEdaData({
        purchaseFreq: freqJson,
        monthlySales: monthJson
      });
      setSegmentationData(segJson);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const generateCampaign = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/retention-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assistantInputs)
      });
      if (!res.ok) throw new Error("Failed to generate campaign");
      const data = await res.json();
      setCampaignResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="animate-spin text-[#6B7280]" size={32} />
        <p className="text-[#6B7280] font-medium">Analyzing customer behavior...</p>
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
          <button onClick={fetchData} className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <header>
        <h2 className="text-2xl font-bold text-[#111827]">Customer Intelligence & Retention</h2>
        <p className="text-sm text-[#6B7280]">Analyze customer structure, behavior, and re-engagement opportunities.</p>
      </header>

      {/* SECTION A – Customer Profile */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Users size={28} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Customer Profile</h3>
            <p className="text-sm text-[#6B7280]">Demographics and Segmentation Overview</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Behavioral Segment Mix - RFM-based */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Behavioral Segment Mix</h3>
                <p className="text-xs text-[#6B7280]">Based on transaction recency and frequency</p>
              </div>
              <div className="p-2 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <Activity size={16} className="text-[#6B7280]" />
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentationData?.behavioralData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B7280', fontSize: 10, fontWeight: 600}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B7280', fontSize: 10}}
                  />
                  <Tooltip 
                    cursor={{fill: '#F9FAFB'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {(segmentationData?.behavioralData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Declared Segment Distribution - CRM */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Declared Segment Distribution</h3>
                <p className="text-xs text-[#6B7280]">Business-defined CRM segments</p>
              </div>
              <div className="p-2 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <Users size={16} className="text-[#6B7280]" />
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={segmentationData?.declaredData || []}
                  margin={{ left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis 
                    type="number"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B7280', fontSize: 10}}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#111827', fontSize: 10, fontWeight: 600}}
                  />
                  <Tooltip 
                    cursor={{fill: '#F9FAFB'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {(segmentationData?.declaredData || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Age Demographics */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm lg:col-span-2">
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#111827]">Age Demographics</h3>
              <p className="text-xs text-[#6B7280]">Age distribution across the customer base</p>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData.ageDist}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" opacity={0.5} />
                  <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-10} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Opt-in Metrics */}
          <div className="space-y-8 lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Mail className="text-indigo-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Email Opt-in</p>
                  <h3 className="text-xl font-bold text-[#111827]">{(customerData.optinRates.emailRate * 100).toFixed(1)}%</h3>
                </div>
              </div>
              <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${customerData.optinRates.emailRate * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <Phone className="text-emerald-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Phone Opt-in</p>
                  <h3 className="text-xl font-bold text-[#111827]">{(customerData.optinRates.phoneRate * 100).toFixed(1)}%</h3>
                </div>
              </div>
              <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${customerData.optinRates.phoneRate * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B – Customer Behavior Analysis */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Activity size={28} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Customer Behavior Analysis</h3>
            <p className="text-sm text-[#6B7280]">Transaction Patterns and Sales Trends</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Purchase Frequency Distribution */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#111827]">Purchase Frequency Distribution</h3>
              <p className="text-xs text-[#6B7280]">Number of transactions per unique customer</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={edaData.purchaseFreq}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="purchases" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-10} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Repeat Rate Implication</h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    A high concentration in the "1" purchase bucket suggests a significant one-time buyer base. 
                    Targeted re-engagement campaigns are critical to move users into higher frequency buckets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Activity / Sales Trend */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#111827]">Monthly Sales Trend</h3>
              <p className="text-xs text-[#6B7280]">Revenue trajectory for top product categories</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={edaData.monthlySales.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  {edaData.monthlySales.categories.map((cat: string, i: number) => (
                    <Line 
                      key={cat} 
                      type="monotone" 
                      dataKey={cat} 
                      stroke={COLORS[i % COLORS.length]} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C – Retention Strategy */}
      <section className="space-y-8 pb-16">
        <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Sparkles size={28} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Retention Strategy</h3>
            <p className="text-sm text-[#6B7280]">AI-Powered Re-engagement and Insights</p>
          </div>
        </div>

        {/* Segmentation Insight panel */}
        <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl flex gap-6 items-start shadow-sm">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-indigo-100">
            <AlertCircle size={24} className="text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-indigo-900 mb-2">Segmentation Insight</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              Behavioral segments reflect real-time customer activity, whereas declared segments are business-defined CRM categories. 
              Discrepancies between these frameworks highlight <strong>targeting alignment opportunities</strong>. 
              For example, a "VIP" who is "Dormant" should be prioritized for a high-value reactivation campaign.
            </p>
          </div>
        </div>

        {/* Customer Retention Assistant component */}
        <div className="bg-[#111827] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Wand2 size={200} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-indigo-500 rounded-2xl">
                <Wand2 size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Customer Retention Assistant</h3>
                <p className="text-sm text-white/40">AI-Powered Campaign Generation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Parameters</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Segment</label>
                    <select 
                      value={assistantInputs.segment}
                      onChange={(e) => setAssistantInputs({...assistantInputs, segment: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                    >
                      <option className="bg-[#111827]">VIP</option>
                      <option className="bg-[#111827]">Loyal</option>
                      <option className="bg-[#111827]">At Risk</option>
                      <option className="bg-[#111827]">New</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Category</label>
                    <select 
                      value={assistantInputs.category}
                      onChange={(e) => setAssistantInputs({...assistantInputs, category: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
                    >
                      <option className="bg-[#111827]">Electronics</option>
                      <option className="bg-[#111827]">Fashion</option>
                      <option className="bg-[#111827]">Home</option>
                      <option className="bg-[#111827]">Beauty</option>
                    </select>
                  </div>
                  <button 
                    onClick={generateCampaign}
                    disabled={generating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    {generating ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    Generate Campaign
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                {campaignResult ? (
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Output</span>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase">Ready</span>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Subject</label>
                        <p className="text-lg font-bold">{campaignResult.subject}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Message</label>
                        <p className="text-sm text-white/70 leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5">
                          {campaignResult.message}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Promotion</label>
                          <p className="text-sm font-bold text-emerald-400">{campaignResult.promotion}</p>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300">
                          {campaignResult.cta} <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <Send size={24} className="text-white/20" />
                    </div>
                    <p className="text-sm text-white/40 max-w-xs">
                      Set parameters and click generate to create a data-driven retention campaign.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
