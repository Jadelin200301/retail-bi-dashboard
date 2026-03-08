import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Sparkles, 
  Menu, 
  X,
  ChevronRight,
  Calendar,
  Filter,
  RefreshCw
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Overview from "./pages/Overview";
import CustomerIntelligence from "./pages/CustomerIntelligence";
import ProductIntelligence from "./pages/ProductIntelligence";
import Recommender from "./pages/Recommender";

export type Page = "Overview" | "CustomerIntelligence" | "ProductIntelligence" | "Recommender";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("Overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Global Filters
  const [filters, setFilters] = useState({
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    countryType: "StoreCountry" as "StoreCountry" | "ClientCountry",
    country: "All",
    category: "All",
    segment: "All"
  });

  const renderPage = () => {
    switch (currentPage) {
      case "Overview": return <Overview filters={filters} />;
      case "CustomerIntelligence": return <CustomerIntelligence filters={filters} />;
      case "ProductIntelligence": return <ProductIntelligence filters={filters} />;
      case "Recommender": return <Recommender filters={filters} />;
      default: return <Overview filters={filters} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          filters={filters} 
          setFilters={setFilters} 
          currentPage={currentPage}
        />
        
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

