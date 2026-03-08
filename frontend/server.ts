import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseISO, isWithinInterval, format } from "date-fns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load data into memory
  const loadData = (filename: string) => {
    const filePath = path.join(__dirname, "data", filename);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  };

  const clients = loadData("clients.json");
  const products = loadData("products.json");
  const stores = loadData("stores.json");
  const stocks = loadData("stocks.json");
  const transactions = loadData("transactions.json");
  const recommendations = loadData("recommendations.json");

  // Helper to get product details
  const getProduct = (id: string) => products.find((p: any) => p.productId === id);
  const getStore = (id: string) => stores.find((s: any) => s.storeId === id);
  const getClient = (id: string) => clients.find((c: any) => c.clientId === id);

  // API Endpoints
  app.get("/api/overview", (req, res) => {
    const { start, end, countryType, country, category } = req.query;
    
    let filtered = transactions;

    // Filter by date
    if (start && end) {
      const startDate = parseISO(start as string);
      const endDate = parseISO(end as string);
      filtered = filtered.filter((t: any) => 
        isWithinInterval(parseISO(t.date), { start: startDate, end: endDate })
      );
    }

    // Filter by countryType and country
    if (country && country !== "All") {
      filtered = filtered.filter((t: any) => {
        if (countryType === "StoreCountry") {
          const store = getStore(t.storeId);
          return store?.country === country;
        } else {
          const client = getClient(t.clientId);
          return client?.country === country;
        }
      });
    }

    // Filter by category
    if (category && category !== "All") {
      filtered = filtered.filter((t: any) => {
        const product = getProduct(t.productId);
        return product?.category === category;
      });
    }

    // KPIs
    const totalSales = filtered.reduce((acc: number, t: any) => acc + t.amount, 0);
    const transactionsCount = filtered.length;
    const activeClients = new Set(filtered.map((t: any) => t.clientId)).size;
    const aov = transactionsCount > 0 ? totalSales / transactionsCount : 0;

    // Timeseries
    const salesByDate: Record<string, number> = {};
    filtered.forEach((t: any) => {
      salesByDate[t.date] = (salesByDate[t.date] || 0) + t.amount;
    });
    const timeseries = Object.entries(salesByDate)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top Categories
    const salesByCategory: Record<string, number> = {};
    filtered.forEach((t: any) => {
      const product = getProduct(t.productId);
      if (product) {
        salesByCategory[product.category] = (salesByCategory[product.category] || 0) + t.amount;
      }
    });
    const topCategories = Object.entries(salesByCategory)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales);

    // Top Products
    const salesByProduct: Record<string, any> = {};
    filtered.forEach((t: any) => {
      if (!salesByProduct[t.productId]) {
        const product = getProduct(t.productId);
        salesByProduct[t.productId] = { 
          productId: t.productId, 
          name: product?.name, 
          category: product?.category, 
          universe: product?.universe, 
          sales: 0, 
          qty: 0 
        };
      }
      salesByProduct[t.productId].sales += t.amount;
      salesByProduct[t.productId].qty += t.qty;
    });
    const topProducts = Object.values(salesByProduct)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 5);

    res.json({
      kpis: { totalSales, transactionsCount, activeClients, aov },
      timeseries,
      topCategories,
      topProducts
    });
  });

  app.get("/api/inventory", (req, res) => {
    const { country, threshold = "10" } = req.query;
    const limit = parseInt(threshold as string);

    let filteredStocks = stocks;
    if (country && country !== "All") {
      filteredStocks = filteredStocks.filter((s: any) => {
        const store = getStore(s.storeId);
        return store?.country === country;
      });
    }

    const lowStockTable = filteredStocks
      .filter((s: any) => s.quantity <= limit)
      .map((s: any) => {
        const product = getProduct(s.productId);
        const store = getStore(s.storeId);
        return {
          storeCountry: store?.country,
          productId: s.productId,
          category: product?.category,
          universe: product?.universe,
          quantity: s.quantity
        };
      });

    res.json({
      lowStockCount: lowStockTable.length,
      lowStockTable
    });
  });

  app.get("/api/customers", (req, res) => {
    const { start, end, country, segment } = req.query;
    
    let filteredClients = clients;
    if (country && country !== "All") {
      filteredClients = filteredClients.filter((c: any) => c.country === country);
    }
    if (segment && segment !== "All") {
      filteredClients = filteredClients.filter((c: any) => c.segment === segment);
    }

    // Segment Distribution
    const segmentCounts: Record<string, number> = {};
    filteredClients.forEach((c: any) => {
      segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    });
    const segmentDist = Object.entries(segmentCounts).map(([segment, count]) => ({ segment, count }));

    // Age Distribution
    const ageBuckets: Record<string, number> = { "18-25": 0, "26-35": 0, "36-45": 0, "46-55": 0, "55+": 0 };
    filteredClients.forEach((c: any) => {
      if (c.age <= 25) ageBuckets["18-25"]++;
      else if (c.age <= 35) ageBuckets["26-35"]++;
      else if (c.age <= 45) ageBuckets["36-45"]++;
      else if (c.age <= 55) ageBuckets["46-55"]++;
      else ageBuckets["55+"]++;
    });
    const ageDist = Object.entries(ageBuckets).map(([bucket, count]) => ({ bucket, count }));

    // Opt-in Rates
    const emailOptins = filteredClients.filter((c: any) => c.emailOptin).length;
    const phoneOptins = filteredClients.filter((c: any) => c.phoneOptin).length;
    const total = filteredClients.length;

    res.json({
      segmentDist,
      ageDist,
      optinRates: {
        emailRate: total > 0 ? emailOptins / total : 0,
        phoneRate: total > 0 ? phoneOptins / total : 0
      }
    });
  });

  app.get("/api/reco/metrics", (req, res) => {
    const { start, end, strategy, stage, k = "5", segment, category, universe, inStockOnly } = req.query;
    const limit = parseInt(k as string);
    
    let filtered = recommendations;

    // Filter by date
    if (start && end) {
      const startDate = parseISO(start as string);
      const endDate = parseISO(end as string);
      filtered = filtered.filter((r: any) => 
        isWithinInterval(parseISO(r.recoDate), { start: startDate, end: endDate })
      );
    }

    // Filter by strategy (multi-select)
    if (strategy) {
      const strategies = (strategy as string).split(",");
      filtered = filtered.filter((r: any) => strategies.includes(r.strategy));
    }

    // Filter by stage
    if (stage && stage !== "All") {
      filtered = filtered.filter((r: any) => r.stage === stage);
    }

    // Filter by category/universe
    if (category && category !== "All") {
      filtered = filtered.filter((r: any) => r.category === category);
    }
    if (universe && universe !== "All") {
      filtered = filtered.filter((r: any) => r.universe === universe);
    }

    // Filter by inStockOnly
    if (inStockOnly === "true") {
      filtered = filtered.filter((r: any) => r.inStockFlag === 1);
    }

    // Filter by segment (requires joining with clients)
    if (segment && segment !== "All") {
      filtered = filtered.filter((r: any) => {
        const client = getClient(r.clientId);
        return client?.segment === segment;
      });
    }

    // Calculate KPIs
    const coverageUsers = new Set(filtered.map((r: any) => r.clientId)).size;
    const totalClients = clients.length;
    const coverageRate = totalClients > 0 ? coverageUsers / totalClients : 0;
    const avgRecsPerUser = coverageUsers > 0 ? filtered.length / coverageUsers : 0;

    // In-stock rate at K
    const topKRecs = filtered.filter((r: any) => r.rank <= limit);
    const inStockCount = topKRecs.filter((r: any) => r.inStockFlag === 1).length;
    const inStockRateAtK = topKRecs.length > 0 ? inStockCount / topKRecs.length : 0;

    // Mock Hit Rate / NDCG / Precision (as we lack labels in the mock data for all)
    const hitRateAtK = 0.45; // Mock
    const precisionAtK = 0.12; // Mock
    const ndcgAtK = 0.38; // Mock

    // Group by Strategy
    const strategyStats: Record<string, any> = {};
    filtered.forEach((r: any) => {
      if (!strategyStats[r.strategy]) {
        strategyStats[r.strategy] = { strategy: r.strategy, inStockCount: 0, total: 0, hitRate: 0.4 + Math.random() * 0.2 };
      }
      strategyStats[r.strategy].total++;
      if (r.inStockFlag === 1) strategyStats[r.strategy].inStockCount++;
    });
    const byStrategy = Object.values(strategyStats).map((s: any) => ({
      strategy: s.strategy,
      inStockRate: s.total > 0 ? s.inStockCount / s.total : 0,
      hitRate: s.hitRate
    }));

    // Group by Segment
    const segmentStats: Record<string, any> = {};
    filtered.forEach((r: any) => {
      const client = getClient(r.clientId);
      const seg = client?.segment || "Unknown";
      if (!segmentStats[seg]) {
        segmentStats[seg] = { segment: seg, hitRate: 0.3 + Math.random() * 0.4 };
      }
    });
    const bySegment = Object.values(segmentStats);

    res.json({
      kpis: { coverageUsers, coverageRate, avgRecsPerUser, inStockRateAtK, hitRateAtK, precisionAtK, ndcgAtK },
      byStrategy,
      bySegment
    });
  });

  app.get("/api/reco/case", (req, res) => {
    const { clientId, date, strategy, stage, k = "5" } = req.query;
    const limit = parseInt(k as string);
    
    let filtered = recommendations;
    if (clientId) filtered = filtered.filter((r: any) => r.clientId === clientId);
    if (date) filtered = filtered.filter((r: any) => r.recoDate === date);
    if (strategy) filtered = filtered.filter((r: any) => r.strategy === strategy);
    if (stage) filtered = filtered.filter((r: any) => r.stage === stage);

    const items = filtered
      .sort((a: any, b: any) => a.rank - b.rank)
      .slice(0, limit)
      .map((r: any) => ({
        rank: r.rank,
        productId: r.productId,
        category: r.category,
        universe: r.universe,
        score: r.score,
        inStockFlag: r.inStockFlag,
        label: Math.random() > 0.5 ? "Purchased" : "Not Purchased"
      }));

    res.json({ items });
  });

  app.post("/api/insights", (req, res) => {
    res.json({
      headline: "Recommendation Performance Summary",
      bullets: [
        "XGB strategy shows 15% higher in-stock rate compared to LGB.",
        "VIP segment hit rate is significantly higher at 65%.",
        "Electronics category recommendations have the highest conversion."
      ],
      risks: [
        "Low coverage in the 'New' customer segment (only 25%).",
        "Out-of-stock items appearing in top-3 ranks for UK stores."
      ],
      next_actions: [
        "Retrain recall_merge model with recent transaction data.",
        "Implement real-time stock filtering in the ranking stage."
      ]
    });
  });

  // EDA Endpoints for Intelligence Page
  app.get("/api/intelligence/eda/purchase-freq", (req, res) => {
    const purchaseCounts: Record<string, number> = {};
    transactions.forEach((t: any) => {
      purchaseCounts[t.clientId] = (purchaseCounts[t.clientId] || 0) + 1;
    });

    const freqDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };
    Object.values(purchaseCounts).forEach((count) => {
      if (count === 1) freqDist["1"]++;
      else if (count === 2) freqDist["2"]++;
      else if (count === 3) freqDist["3"]++;
      else if (count === 4) freqDist["4"]++;
      else freqDist["5+"]++;
    });

    const data = Object.entries(freqDist).map(([purchases, count]) => ({ purchases, count }));
    res.json(data);
  });

  app.get("/api/intelligence/eda/monthly-sales", (req, res) => {
    const salesByMonthCategory: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();

    transactions.forEach((t: any) => {
      const month = t.date.substring(0, 7); // YYYY-MM
      const product = getProduct(t.productId);
      if (product) {
        if (!salesByMonthCategory[month]) salesByMonthCategory[month] = {};
        salesByMonthCategory[month][product.category] = (salesByMonthCategory[month][product.category] || 0) + t.amount;
        categories.add(product.category);
      }
    });

    const topCategories = Array.from(categories).slice(0, 3);
    const data = Object.entries(salesByMonthCategory)
      .map(([month, cats]) => {
        const entry: any = { month };
        topCategories.forEach(cat => {
          entry[cat] = cats[cat] || 0;
        });
        return entry;
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ data, categories: topCategories });
  });

  app.get("/api/intelligence/eda/long-tail", (req, res) => {
    const salesByProduct: Record<string, number> = {};
    transactions.forEach((t: any) => {
      salesByProduct[t.productId] = (salesByProduct[t.productId] || 0) + t.amount;
    });

    const sortedSales = Object.values(salesByProduct).sort((a, b) => b - a);
    const data = sortedSales.map((sales, index) => ({ index, sales }));
    
    // Sample for visualization if too many
    const sampledData = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 50)) === 0);
    res.json(sampledData);
  });

  app.get("/api/intelligence/eda/category-share", (req, res) => {
    const transByCategory: Record<string, number> = {};
    transactions.forEach((t: any) => {
      const product = getProduct(t.productId);
      if (product) {
        transByCategory[product.category] = (transByCategory[product.category] || 0) + 1;
      }
    });

    const data = Object.entries(transByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    res.json(data);
  });

  app.get("/api/intelligence/segmentation", (req, res) => {
    const now = new Date("2026-03-03");
    
    // 1. Behavioral Segment Mix
    const clientStats: Record<string, { count: number, lastDate: Date }> = {};
    transactions.forEach((t: any) => {
      const date = parseISO(t.date);
      if (!clientStats[t.clientId]) {
        clientStats[t.clientId] = { count: 0, lastDate: date };
      }
      clientStats[t.clientId].count++;
      if (date > clientStats[t.clientId].lastDate) {
        clientStats[t.clientId].lastDate = date;
      }
    });

    const behavioralCounts = { "New": 0, "Repeaters": 0, "At-Risk": 0, "Dormant": 0 };
    Object.values(clientStats).forEach(stats => {
      const diffDays = (now.getTime() - stats.lastDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 30) {
        if (stats.count === 1) behavioralCounts["New"]++;
        else behavioralCounts["Repeaters"]++;
      } else if (diffDays <= 90) {
        behavioralCounts["At-Risk"]++;
      } else {
        behavioralCounts["Dormant"]++;
      }
    });

    const behavioralData = Object.entries(behavioralCounts).map(([name, value]) => ({ name, value }));

    // 2. Declared Segment Distribution
    const declaredCounts = { "VIP": 0, "Loyal": 0, "Prospect": 0, "Inactive_1Y": 0 };
    clients.forEach((c: any) => {
      if (c.segment === "VIP") declaredCounts["VIP"]++;
      else if (c.segment === "Regular") declaredCounts["Loyal"]++;
      else if (c.segment === "New") declaredCounts["Prospect"]++;
      else declaredCounts["Inactive_1Y"]++;
    });

    const declaredData = Object.entries(declaredCounts).map(([name, value]) => ({ name, value }));

    res.json({ behavioralData, declaredData });
  });

  app.post("/api/retention-assistant", (req, res) => {
    const { segment, category, season, sensitivity } = req.body;

    // Mock logic for generating a campaign based on inputs
    const campaigns: any = {
      "VIP": {
        subject: `Exclusive Early Access: Our New ${category} Collection`,
        message: `As one of our most valued customers, we're giving you first pick of our ${season} ${category} arrivals. These hand-selected pieces match your sophisticated taste and high-quality standards.`,
        promotion: "Complimentary Premium Gift",
        cta: "Shop Private Collection"
      },
      "Loyal": {
        subject: `A Special Thank You for Your Continued Loyalty`,
        message: `We've noticed your love for ${category}. This ${season}, we've curated a special selection just for you. Thank you for being part of our journey!`,
        promotion: "15% Loyalty Discount",
        cta: "Explore Your Picks"
      },
      "At Risk": {
        subject: `We Miss You! Here's Something Special to Welcome You Back`,
        message: `It's been a while since your last visit. We've just released our ${season} ${category} line and thought you'd love it. Come see what's new!`,
        promotion: "25% Reactivation Offer",
        cta: "Claim Your Discount"
      },
      "New": {
        subject: `Welcome to the Family: Your ${season} Style Guide`,
        message: `Start your journey with us by exploring our latest ${category} arrivals. This ${season} is all about fresh starts and bold choices.`,
        promotion: "First Order Bonus",
        cta: "Start Shopping"
      }
    };

    const defaultCampaign = {
      subject: `Discover the Best of ${category} this ${season}`,
      message: `Our latest ${category} collection for ${season} has arrived. Designed for those who value both style and substance, these pieces are a perfect addition to your wardrobe.`,
      promotion: sensitivity === "High" ? "Limited Time 20% Off" : "Exclusive Member Access",
      cta: "View Collection"
    };

    const result = campaigns[segment] || defaultCampaign;

    // Adjust based on price sensitivity if needed
    if (sensitivity === "High" && !result.promotion.includes("%")) {
      result.promotion = "Special Value Bundle Offer";
    }

    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
