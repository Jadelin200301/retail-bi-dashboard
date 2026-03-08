import { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import KpiCards from "../components/KpiCards";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function Overview({ filters }: { filters: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: filters.startDate,
        end: filters.endDate,
        countryType: filters.countryType,
        country: filters.country,
        category: filters.category
      });
      const res = await fetch(`/api/overview?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch overview data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCw className="animate-spin text-[#6B7280]" size={32} />
        <p className="text-[#6B7280] font-medium">Loading overview data...</p>
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
          <button 
            onClick={fetchData}
            className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#111827]">Overview</h2>
        <p className="text-sm text-[#6B7280]">Business Performance Overview</p>
      </div>

      <KpiCards data={data.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Timeseries */}
        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="mb-8">
            <h3 className="text-base font-bold text-[#111827]">Sales Performance</h3>
            <p className="text-xs text-[#6B7280]">Revenue trends over the selected period</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeseries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10B981" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="mb-8">
            <h3 className="text-base font-bold text-[#111827]">Top Categories</h3>
            <p className="text-xs text-[#6B7280]">Revenue distribution by product category</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topCategories} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#111827', fontSize: 11, fontWeight: 500 }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="sales" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={16}>
                  {data.topCategories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4F46E5' : '#818CF8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#E5E7EB]">
          <h3 className="text-base font-bold text-[#111827]">Top Performing Products</h3>
          <p className="text-xs text-[#6B7280]">High-volume and high-revenue products</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F9FAFB] text-[#6B7280] text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4 font-bold">Product ID</th>
                <th className="px-8 py-4 font-bold">Name</th>
                <th className="px-8 py-4 font-bold">Category</th>
                <th className="px-8 py-4 font-bold">Universe</th>
                <th className="px-8 py-4 font-bold text-right">Qty Sold</th>
                <th className="px-8 py-4 font-bold text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.topProducts.map((p: any) => (
                <tr key={p.productId} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-8 py-5 text-sm font-mono text-[#6B7280]">{p.productId}</td>
                  <td className="px-8 py-5 text-sm font-bold text-[#111827]">{p.name}</td>
                  <td className="px-8 py-5 text-sm text-[#6B7280]">{p.category}</td>
                  <td className="px-8 py-5 text-sm text-[#6B7280]">{p.universe}</td>
                  <td className="px-8 py-5 text-sm text-right font-medium">{p.qty}</td>
                  <td className="px-8 py-5 text-sm text-right font-bold text-[#111827]">${p.sales.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
