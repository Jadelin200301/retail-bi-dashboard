import { useState, useEffect } from "react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from "recharts";
import { 
  RefreshCw, 
  AlertCircle, 
  Package, 
  AlertTriangle,
  TrendingUp
} from "lucide-react";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ProductIntelligence({ filters }: { filters: any }) {
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [edaData, setEdaData] = useState<any>({
    longTail: null,
    categoryShare: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const invParams = new URLSearchParams({
        country: filters.country,
        threshold: threshold.toString()
      });

      const [invRes, tailRes, shareRes] = await Promise.all([
        fetch(`/api/inventory?${invParams.toString()}`),
        fetch("/api/intelligence/eda/long-tail"),
        fetch("/api/intelligence/eda/category-share")
      ]);

      if (!invRes.ok || !tailRes.ok || !shareRes.ok) {
        throw new Error("Failed to fetch product intelligence data");
      }
      
      const [invJson, tailJson, shareJson] = await Promise.all([
        invRes.json(),
        tailRes.json(),
        shareRes.json()
      ]);

      setInventoryData(invJson);
      setEdaData({
        longTail: tailJson,
        categoryShare: shareJson
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, threshold]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="animate-spin text-[#6B7280]" size={32} />
        <p className="text-[#6B7280] font-medium">Monitoring product & inventory health...</p>
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
        <h2 className="text-2xl font-bold text-[#111827]">Product & Inventory Intelligence</h2>
        <p className="text-sm text-[#6B7280]">Monitor product structure and inventory health across categories.</p>
      </header>

      {/* SECTION A – Product Structure */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="p-3 bg-amber-50 rounded-xl">
            <TrendingUp size={28} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Product Structure</h3>
            <p className="text-sm text-[#6B7280]">Sales Concentration and Category Share</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Long-tail Distribution */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#111827]">Long-tail Distribution</h3>
              <p className="text-xs text-[#6B7280]">Sales volume across individual products (Ranked)</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={edaData.longTail}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="index" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-10} />
                  <Tooltip labelStyle={{ display: 'none' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#F59E0B" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-[10px] text-[#9CA3AF] text-center italic">
              The steep decline indicates a strong "Head" of bestsellers, followed by a significant "Long Tail" of niche products.
            </p>
          </div>

          {/* Transaction Share by Category */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
            <div className="mb-8">
              <h3 className="text-base font-bold text-[#111827]">Transaction Share by Category</h3>
              <p className="text-xs text-[#6B7280]">Volume distribution across product categories</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={edaData.categoryShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {edaData.categoryShare.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B – Inventory Monitoring */}
      <section className="space-y-8 pb-16">
        <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="p-3 bg-rose-50 rounded-xl">
            <Package size={28} className="text-rose-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#111827]">Inventory Monitoring</h3>
            <p className="text-sm text-[#6B7280]">Real-time Stock Health and Risk Alerts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Low Stock Alerts */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-center gap-6">
            <div className="p-4 bg-rose-50 rounded-2xl">
              <AlertTriangle className="text-rose-600" size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Low Stock Alerts</p>
              <h3 className="text-3xl font-bold text-[#111827] mt-1">{inventoryData.lowStockCount}</h3>
            </div>
          </div>

          {/* Inventory Threshold Control */}
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm flex items-center gap-8 md:col-span-2">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Stock Threshold Control</p>
                  <p className="text-[10px] text-[#9CA3AF]">Adjust threshold to identify critical stock levels</p>
                </div>
                <span className="text-xs font-bold bg-[#F3F4F6] px-3 py-1.5 rounded-lg border border-[#E5E7EB]">{threshold} units</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={threshold} 
                onChange={(e) => setThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-[#F3F4F6] rounded-lg appearance-none cursor-pointer accent-[#4F46E5]"
              />
            </div>
          </div>
        </div>

        {/* Inventory Health Table */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#E5E7EB] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#111827]">Inventory Health Table</h3>
              <p className="text-xs text-[#6B7280]">Detailed breakdown of items below threshold</p>
            </div>
            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full uppercase tracking-widest">Action Required</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-5 font-bold">Country</th>
                  <th className="px-8 py-5 font-bold">Product ID</th>
                  <th className="px-8 py-5 font-bold">Category</th>
                  <th className="px-8 py-5 font-bold text-right">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {inventoryData.lowStockTable.map((item: any, idx: number) => (
                  <tr key={`${item.productId}-${idx}`} className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="px-8 py-5 text-sm font-medium text-[#111827]">{item.storeCountry}</td>
                    <td className="px-8 py-5 text-sm font-mono text-[#6B7280]">{item.productId}</td>
                    <td className="px-8 py-5 text-sm text-[#6B7280]">{item.category}</td>
                    <td className="px-8 py-5 text-sm text-right font-bold text-rose-600">{item.quantity}</td>
                  </tr>
                ))}
                {inventoryData.lowStockTable.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-[#6B7280] text-sm italic">No low stock items found for the current threshold.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
