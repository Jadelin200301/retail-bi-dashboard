import { Calendar, Filter, Globe, Tag } from "lucide-react";
import { Page } from "../App";

interface HeaderProps {
  filters: any;
  setFilters: (filters: any) => void;
  currentPage: Page;
}

export default function Header({ filters, setFilters, currentPage }: HeaderProps) {
  const countries = ["All", "USA", "UK", "France", "Germany"];
  const categories = ["All", "Apparel", "Footwear", "Electronics", "Home Appliances", "Equipment"];

  const getPageTitle = () => {
    switch (currentPage) {
      case "Overview": return "Business Overview";
      case "CustomerIntelligence": return "Customer Intelligence";
      case "ProductIntelligence": return "Product & Inventory";
      case "Recommender": return "Recommendation System";
      default: return currentPage;
    }
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-2xl font-bold text-[#111827]">{getPageTitle()}</h2>
        <p className="text-sm text-[#6B7280]">Real-time business insights and analytics</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg border border-[#E5E7EB]">
          <Calendar size={16} className="text-[#6B7280]" />
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          />
          <span className="text-[#9CA3AF]">-</span>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          />
        </div>

        {/* Country Type Toggle */}
        <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-lg border border-[#E5E7EB]">
          <button
            onClick={() => setFilters({ ...filters, countryType: "StoreCountry" })}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filters.countryType === "StoreCountry" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Store
          </button>
          <button
            onClick={() => setFilters({ ...filters, countryType: "ClientCountry" })}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filters.countryType === "ClientCountry" ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Client
          </button>
        </div>

        {/* Country Select */}
        <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg border border-[#E5E7EB]">
          <Globe size={16} className="text-[#6B7280]" />
          <select 
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Category Select */}
        <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg border border-[#E5E7EB]">
          <Tag size={16} className="text-[#6B7280]" />
          <select 
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </header>
  );
}
