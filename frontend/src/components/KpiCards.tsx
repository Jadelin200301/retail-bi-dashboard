import { TrendingUp, ShoppingCart, Users, DollarSign, UserCheck } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendUp?: boolean;
}

function KpiCard({ title, value, icon: Icon, trend, trendUp }: KpiCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-[#F3F4F6] rounded-lg">
          <Icon size={24} className="text-[#111827]" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[#6B7280]">{title}</p>
        <h3 className="text-2xl font-bold text-[#111827] mt-1">{value}</h3>
      </div>
    </div>
  );
}

export default function KpiCards({ data }: { data: any }) {
  if (!data) return null;

  const revPerCustomer = data.activeClients > 0 ? data.totalSales / data.activeClients : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KpiCard 
        title="Total Revenue" 
        value={`$${data.totalSales.toLocaleString()}`} 
        icon={DollarSign} 
        trend="+12.5%" 
        trendUp={true} 
      />
      <KpiCard 
        title="Orders" 
        value={data.transactionsCount.toLocaleString()} 
        icon={ShoppingCart} 
        trend="+5.2%" 
        trendUp={true} 
      />
      <KpiCard 
        title="Active Customers" 
        value={data.activeClients.toLocaleString()} 
        icon={Users} 
        trend="-2.1%" 
        trendUp={false} 
      />
      <KpiCard 
        title="Revenue per Active Customer" 
        value={`$${revPerCustomer.toFixed(2)}`} 
        icon={UserCheck} 
        trend="+8.4%" 
        trendUp={true} 
      />
    </div>
  );
}
