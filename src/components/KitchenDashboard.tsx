import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle, User, UtensilsCrossed, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuManagement } from "./MenuManagement";
import { DailyReport } from "./DailyReport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// API base
const API = (import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:4001";

const fetchLiveOrders = async () => {
  try {
    const res = await fetch(`${API}/orders`, { cache: 'no-store' as any });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn("Failed to fetch orders from backend, falling back to empty list", e);
    return [];
  }
};

const updateOrderStatus = async (orderId: string, newStatus: string) => {
  try {
    const res = await fetch(`${API}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    return res.ok ? await res.json() : { success: false };
  } catch (e) {
    console.warn("Failed to update order status", e);
    return { success: false };
  }
};

const generateBillForOrder = async (order: any) => {
  try {
    const res = await fetch(`${API}/bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: order.tableNumber, customerName: order.customerName, items: order.items }),
    });
    if (!res.ok) return { success: false };
    const body = await res.json();
    // mark order completed
    await updateOrderStatus(order.id, "COMPLETED");
    return { success: true, bill: body.bill };
  } catch (e) {
    console.warn("Failed to generate bill", e);
    return { success: false };
  }
};

type Order = {
  id: string;
  tableNumber: number;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  totalAmount: number;
  status: string;
  timestamp: number;
};

export const KitchenDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reportTick, setReportTick] = useState(0);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [billSubmitting, setBillSubmitting] = useState(false);

  useEffect(() => {
    // Initial fetch
    loadOrders();

    // Simulate real-time updates every 5 seconds
    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    const fetchedOrders = await fetchLiveOrders();
    setOrders(fetchedOrders);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-muted text-muted-foreground";
      case "PREPARING":
        return "bg-primary/20 text-primary";
      case "READY":
        return "bg-accent text-accent-foreground";
      case "BILL_REQUESTED":
        return "bg-destructive text-destructive-foreground animate-pulse";
      case "COMPLETED":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const getActionButton = (order: Order) => {
    switch (order.status) {
      case "PENDING":
        return (
          <Button
            onClick={() => handleStatusChange(order.id, "PREPARING")}
            className="w-full"
            size="lg"
          >
            Accept Order
          </Button>
        );
      case "PREPARING":
        return (
          <Button
            onClick={() => handleStatusChange(order.id, "READY")}
            className="w-full"
            size="lg"
          >
            Mark Ready
          </Button>
        );
      case "READY":
        return (
          <Button
            onClick={() => {
              setBillOrder(order);
              setBillOpen(true);
            }}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Generate Bill
          </Button>
        );
      case "BILL_REQUESTED":
        return (
          <Button
            onClick={() => {
              setBillOrder(order);
              setBillOpen(true);
            }}
            className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
            size="lg"
          >
            Generate Bill & Close
          </Button>
        );
      default:
        return null;
    }
  };

  const getTimeSince = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    return `${minutes} mins ago`;
  };

  const sortedOrders = [...orders].sort((a, b) => {
    // Bill requested orders first
    if (a.status === "BILL_REQUESTED" && b.status !== "BILL_REQUESTED") return -1;
    if (b.status === "BILL_REQUESTED" && a.status !== "BILL_REQUESTED") return 1;
    // Then by timestamp (oldest first)
    return a.timestamp - b.timestamp;
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-card border-b p-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
            <CheckCircle className="w-8 h-8 text-primary" />
            Kitchen Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage orders, menu, and view reports
          </p>
          <div className="mt-3">
            <Button onClick={async () => {
              await loadOrders();
              try { localStorage.setItem("reports-updated", Date.now().toString()); } catch (e) {}
              setReportTick((t) => t + 1);
            }} size="sm">Refresh</Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Orders
              {orders.filter(o => o.status !== "COMPLETED").length > 0 && (
                <Badge className="ml-1 bg-primary/20 text-primary">{orders.filter(o => o.status !== "COMPLETED").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {orders.filter((o) => o.status !== "COMPLETED").length === 0 ? (
              <Card className="p-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-medium text-muted-foreground">No Active Orders</h2>
                <p className="text-muted-foreground mt-2">
                  New orders will appear here automatically
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedOrders.filter(o => o.status !== "COMPLETED").map((order) => (
                  <Card
                    key={order.id}
                    className={`p-6 space-y-4 ${
                      order.status === "BILL_REQUESTED" ? "ring-2 ring-destructive" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-bold">Table {order.tableNumber}</h2>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="text-lg">{order.customerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-mono font-medium">{order.id}</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-lg">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-xl">
                          <span>Total</span>
                          <span>₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeSince(order.timestamp)}</span>
                    </div>

                    <div>
                      {getActionButton(order)}
                      {order.status === "READY" && (
                        <div className="mt-2">
                          <Button
                            onClick={async () => {
                              const r = await generateBillForOrder(order);
                              if (r.success) {
                                // reload orders to reflect completed status
                                loadOrders();
                                // trigger report refresh in this tab
                                setReportTick((t) => t + 1);
                                try {
                                  localStorage.setItem("reports-updated", Date.now().toString());
                                } catch (e) {
                                  // ignore if localStorage not available
                                }
                                alert("Bill generated and order completed");
                              } else {
                                alert("Failed to generate bill");
                              }
                            }}
                            className="w-full bg-secondary"
                          >
                            Generate Bill
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="menu">
            <MenuManagement />
          </TabsContent>

          <TabsContent value="reports">
            <DailyReport refreshKey={reportTick} />
          </TabsContent>

          <TabsContent value="completed">
            {sortedOrders.filter(o => o.status === "COMPLETED").length === 0 ? (
              <Card className="p-12 text-center">
                <h2 className="text-2xl font-medium text-muted-foreground">No Completed Orders</h2>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedOrders.filter(o => o.status === "COMPLETED").map(order => (
                  <Card key={order.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-bold">Table {order.tableNumber}</h2>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="text-lg">{order.customerName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-mono font-medium">{order.id}</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-lg">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-xl">
                          <span>Total</span>
                          <span>₹{order.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bill confirmation dialog */}
      <AlertDialog open={billOpen} onOpenChange={setBillOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bill</AlertDialogTitle>
            <AlertDialogDescription>
              {billOrder ? (
                <div className="space-y-3 mt-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Table</span>
                    <span className="font-medium">{billOrder.tableNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Customer</span>
                    <span className="font-medium">{billOrder.customerName}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="space-y-1">
                      {billOrder.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{it.quantity}x {it.name}</span>
                          {/* price may not be available in type; rely on totalAmount for subtotal */}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1">
                      {(() => {
                        const subtotal = billOrder.totalAmount || 0;
                        const tax = Math.round(subtotal * 0.05);
                        const service = Math.round(subtotal * 0.02);
                        const total = subtotal + tax + service;
                        return (
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
                            <div className="flex justify-between text-sm"><span>Tax (5%)</span><span>₹{tax}</span></div>
                            <div className="flex justify-between text-sm"><span>Service (2%)</span><span>₹{service}</span></div>
                            <div className="flex justify-between font-semibold text-base mt-1"><span>Total</span><span>₹{total}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <span>Preparing bill...</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={billSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!billOrder) return;
                try {
                  setBillSubmitting(true);
                  const r = await generateBillForOrder(billOrder);
                  if (r.success) {
                    setBillOpen(false);
                    setBillOrder(null);
                    await loadOrders();
                    setReportTick((t) => t + 1);
                    alert("Bill generated and order completed");
                  } else {
                    alert("Failed to generate bill");
                  }
                } finally {
                  setBillSubmitting(false);
                }
              }}
              disabled={billSubmitting}
            >
              {billSubmitting ? "Generating..." : "Generate Bill"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
