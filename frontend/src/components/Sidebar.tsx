import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Sparkles, 
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Page } from "../App";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export default function Sidebar({ isOpen, setIsOpen, currentPage, setCurrentPage }: SidebarProps) {
  const menuItems = [
    { id: "Overview", label: "Business Overview", icon: LayoutDashboard },
    { id: "CustomerIntelligence", label: "Customer Intelligence", icon: Users },
    { id: "ProductIntelligence", label: "Product & Inventory", icon: Package },
    { id: "Recommender", label: "Recommendation System", icon: Sparkles },
  ];

  return (
    <aside 
      className={cn(
        "bg-[#1A1A1A] text-white transition-all duration-300 flex flex-col h-full",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        {isOpen && <h1 className="text-xl font-bold tracking-tight">BI Dashboard</h1>}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id as Page)}
              className={cn(
                "w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all group",
                isActive 
                  ? "bg-white text-[#1A1A1A] font-semibold" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={22} className={cn(isActive ? "text-[#1A1A1A]" : "text-white/60 group-hover:text-white")} />
              {isOpen && <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold">JD</div>
          {isOpen && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Jane Doe</span>
              <span className="text-xs text-white/40">Admin</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
