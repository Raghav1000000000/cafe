import { useState, useEffect } from "react";
import { Calendar, TrendingUp, IndianRupee, ShoppingBag, Users, Download, BarChart3, PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Backend API
const API = (import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:4001";

const fetchReport = async (date: string, type: "daily" | "weekly" | "monthly") => {
  try {
    const res = await fetch(`${API}/reports/${type}?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error("Failed to fetch report");
    return await res.json();
  } catch (e) {
    console.warn(`Failed to load ${type} report from backend, falling back to placeholder`, e);
    // Return a placeholder structure based on type
    const baseData = {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalCustomers: 0,
      topItems: []
    };
    
    if (type === "daily") {
      return {
        date,
        ...baseData,
        hourlyBreakdown: Array.from({ length: 24 }, (_, h) => ({
          hour: `${String(h).padStart(2, "0")}:00`,
          orders: 0,
          revenue: 0
        }))
      };
    } else if (type === "weekly") {
      return {
        week: `${date} to ${date}`,
        ...baseData,
        dailyBreakdown: Array.from({ length: 7 }, (_, d) => ({
          day: new Date(Date.now() + d * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
          orders: 0,
          revenue: 0
        }))
      };
    } else { // monthly
      return {
        month: date.substring(0, 7),
        ...baseData,
        weeklyBreakdown: []
      };
    }
  }
};

type ReportData = {
  // Common fields
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalCustomers: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
} & (
  // Daily report
  | { date: string; hourlyBreakdown: Array<{ hour: string; orders: number; revenue: number }> }
  // Weekly report
  | { week: string; dailyBreakdown: Array<{ day: string; orders: number; revenue: number }> }
  // Monthly report
  | { month: string; weeklyBreakdown: Array<{ week: string; orders: number; revenue: number }> }
);

export const DailyReport = ({ refreshKey }: { refreshKey?: number }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportDate]);

  // Listen for cross-tab report updates (e.g., when kitchen generates a bill)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reports-updated") {
        loadReport();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reportDate]);

  // When parent signals a refresh in the same tab (reportTick), reload
  useEffect(() => {
    if (typeof refreshKey === "number") {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchReport(reportDate, reportType);
      setReport(data);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csvData = [
      ['Metric', 'Value']
    ];

    // Add date/week/month info
    if ('date' in report) {
      csvData.push(['Date', report.date]);
    } else if ('week' in report) {
      csvData.push(['Week', report.week]);
    } else if ('month' in report) {
      csvData.push(['Month', report.month]);
    }

    csvData.push(
      ['Total Orders', report.totalOrders.toString()],
      ['Total Revenue', `₹${report.totalRevenue.toLocaleString()}`],
      ['Average Order Value', `₹${report.averageOrderValue.toFixed(2)}`],
      ['Total Customers', report.totalCustomers.toString()],
      ['', ''],
      ['Top Items', ''],
      ['Item', 'Quantity', 'Revenue']
    );

    report.topItems.forEach(item => {
      csvData.push([item.name, item.quantity.toString(), `₹${item.revenue.toLocaleString()}`]);
    });

    csvData.push(['', ''], ['Breakdown', '', '']);

    // Add appropriate breakdown based on report type
    if ('hourlyBreakdown' in report) {
      csvData.push(['Hour', 'Orders', 'Revenue']);
      report.hourlyBreakdown.forEach(hour => {
        csvData.push([hour.hour, hour.orders.toString(), `₹${hour.revenue.toLocaleString()}`]);
      });
    } else if ('dailyBreakdown' in report) {
      csvData.push(['Day', 'Orders', 'Revenue']);
      report.dailyBreakdown.forEach(day => {
        csvData.push([day.day, day.orders.toString(), `₹${day.revenue.toLocaleString()}`]);
      });
    } else if ('weeklyBreakdown' in report) {
      csvData.push(['Week', 'Orders', 'Revenue']);
      report.weeklyBreakdown.forEach(week => {
        csvData.push([week.week, week.orders.toString(), `₹${week.revenue.toLocaleString()}`]);
      });
    }

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename based on report type
    let filename = 'cafe-report';
    if ('date' in report) {
      filename += `-${report.date}`;
    } else if ('week' in report) {
      filename += `-${report.week.replace(/\s+to\s+/g, '-to-')}`;
    } else if ('month' in report) {
      filename += `-${report.month}`;
    }
    filename += '.csv';
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!report)
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium">Loading report…</h3>
        <p className="text-sm text-muted-foreground mt-2">Fetching data from the backend</p>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-muted-foreground">View sales and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={reportType} onValueChange={(value: "daily" | "weekly" | "monthly") => setReportType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-4 py-2 rounded-md border bg-background"
            max={new Date().toISOString().split("T")[0]}
          />
          <Button onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setReportDate(today);
            setTimeout(() => loadReport(), 0);
          }} size="sm">Today</Button>
          <Button onClick={exportReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => loadReport()} size="sm" disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Top Items</TabsTrigger>
          <TabsTrigger value="breakdown">
            {reportType === "daily" ? "Hourly" : reportType === "weekly" ? "Daily" : "Weekly"}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold mt-2">{report.totalOrders}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2">₹{report.totalRevenue}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <IndianRupee className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Order Value</p>
                  <p className="text-3xl font-bold mt-2">₹{report.averageOrderValue.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                  <p className="text-3xl font-bold mt-2">{report.totalCustomers}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          {/* Top Items */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Selling Items
            </h3>
            <div className="space-y-3">
              {report.topItems.length === 0 && (
                <div className="text-muted-foreground">No sales for the selected date.</div>
              )}
              {report.topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Badge className="text-lg px-3 py-1">#{idx + 1}</Badge>
                    <div>
                      <p className="font-medium text-lg">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.quantity} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">₹{item.revenue}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.quantity ? (item.revenue / item.quantity).toFixed(0) : "-"} per item
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {/* Breakdown based on report type */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {reportType === "daily" ? "Hourly Breakdown" : reportType === "weekly" ? "Daily Breakdown" : "Weekly Breakdown"}
            </h3>
            <div className="space-y-2">
              {(() => {
                if ('hourlyBreakdown' in report) {
                  return report.hourlyBreakdown.map((hour, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="font-medium w-20">{hour.hour}</span>
                      <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-3"
                          style={{
                            width: `${(hour.revenue / Math.max(1, ...report.hourlyBreakdown.map((h) => h.revenue))) * 100}%`,
                          }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">
                            {hour.orders} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-bold w-24 text-right">₹{hour.revenue}</span>
                    </div>
                  ));
                } else if ('dailyBreakdown' in report) {
                  return report.dailyBreakdown.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="font-medium w-20">{day.day}</span>
                      <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-3"
                          style={{
                            width: `${(day.revenue / Math.max(1, ...report.dailyBreakdown.map((d) => d.revenue))) * 100}%`,
                          }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">
                            {day.orders} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-bold w-24 text-right">₹{day.revenue}</span>
                    </div>
                  ));
                } else if ('weeklyBreakdown' in report) {
                  return report.weeklyBreakdown.map((week, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="font-medium w-32 text-sm">{week.week}</span>
                      <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-3"
                          style={{
                            width: `${(week.revenue / Math.max(1, ...report.weeklyBreakdown.map((w) => w.revenue))) * 100}%`,
                          }}
                        >
                          <span className="text-xs font-medium text-primary-foreground">
                            {week.orders} orders
                          </span>
                        </div>
                      </div>
                      <span className="font-bold w-24 text-right">₹{week.revenue}</span>
                    </div>
                  ));
                }
                return <div className="text-muted-foreground">No breakdown data available.</div>;
              })()}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Placeholder */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics
            </h3>
            <div className="text-center py-8">
              <PieChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Advanced analytics coming soon...</p>
              <p className="text-sm text-muted-foreground mt-2">
                This section will include charts, trends, and insights.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
