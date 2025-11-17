import { useState, useEffect } from "react";
import { BarChart3, Users, DollarSign, TrendingUp, Settings, Database, FileText, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DailyReport } from "./DailyReport";

// API URL
const API = (import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:4001";

interface SystemStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  activeTables: number;
  pendingOrders: number;
  completedOrders: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    activeTables: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);
  
  // WhatsApp settings
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [whatsappCredits, setWhatsappCredits] = useState(1000); // Free tier limit
  const [whatsappUsed, setWhatsappUsed] = useState(0);

  // SMS settings
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiSecret, setSmsApiSecret] = useState("");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState("");
  const [smsCredits, setSmsCredits] = useState(100);
  const [smsUsed, setSmsUsed] = useState(0);
  const [availableSmsProviders, setAvailableSmsProviders] = useState<string[]>([]);

  useEffect(() => {
    loadSystemStats();
    loadWhatsappSettings();
    loadSmsSettings();
  }, []);

  const loadWhatsappSettings = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/settings`);
      if (res.ok) {
        const data = await res.json();
        setWhatsappEnabled(data.settings.enabled);
        setWhatsappApiKey(data.settings.apiKey);
        setWhatsappPhoneNumber(data.settings.phoneNumber);
        setWhatsappCredits(data.settings.credits);
        setWhatsappUsed(data.settings.used);
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  };

  const loadSmsSettings = async () => {
    try {
      const res = await fetch(`${API}/sms/settings`);
      if (res.ok) {
        const data = await res.json();
        setSmsEnabled(data.settings.enabled);
        setSmsProvider(data.settings.provider);
        setSmsApiKey(data.settings.apiKey);
        setSmsApiSecret(data.settings.apiSecret);
        setSmsPhoneNumber(data.settings.phoneNumber);
        setSmsCredits(data.settings.credits);
        setSmsUsed(data.settings.used);
        setAvailableSmsProviders(data.providers);
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Get orders
      const ordersRes = await fetch(`${API}/orders`);
      const orders = ordersRes.ok ? await ordersRes.json() : [];

      // Get today's report for revenue
      const reportRes = await fetch(`${API}/reports/daily`);
      const report = reportRes.ok ? await reportRes.json() : { totalRevenue: 0, totalOrders: 0, totalCustomers: 0 };

      // Calculate stats
      const pendingOrders = orders.filter((o: any) => o.status === 'PENDING').length;
      const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').length;
      const activeTables = new Set(orders.filter((o: any) => o.status !== 'COMPLETED').map((o: any) => o.tableNumber)).size;

      setStats({
        totalOrders: orders.length,
        totalRevenue: report.totalRevenue || 0,
        totalCustomers: report.totalCustomers || 0,
        activeTables,
        pendingOrders,
        completedOrders
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTestBills = async () => {
    try {
      const res = await fetch(`${API}/admin/generate-test-bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Generated ${result.bills?.length || 0} test bills`);
        loadSystemStats(); // Refresh stats
      } else {
        alert('Failed to generate test bills');
      }
    } catch (error) {
      console.error('Error generating test bills:', error);
      alert('Error generating test bills');
    }
  };

  const seedMenu = async () => {
    try {
      const res = await fetch(`${API}/admin/seed-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Seeded ${result.inserted || 0} menu items`);
      } else {
        alert('Failed to seed menu');
      }
    } catch (error) {
      console.error('Error seeding menu:', error);
      alert('Error seeding menu');
    }
  };

  // WhatsApp functions
  const saveWhatsappSettings = async () => {
    try {
      const res = await fetch(`${API}/whatsapp/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: whatsappEnabled,
          apiKey: whatsappApiKey,
          phoneNumber: whatsappPhoneNumber
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setWhatsappCredits(data.settings.credits);
        setWhatsappUsed(data.settings.used);
        alert('WhatsApp settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      alert('Error saving WhatsApp settings');
    }
  };

  const sendWhatsappMessage = async (phone: string, message: string) => {
    const res = await fetch(`${API}/whatsapp/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to send WhatsApp message');
    }
    
    const result = await res.json();
    if (result.success) {
      // Refresh settings to get updated credit count
      loadWhatsappSettings();
      return true;
    } else {
      throw new Error(result.message || 'Failed to send WhatsApp message');
    }
  };

  const testWhatsappConnection = async () => {
    try {
      await sendWhatsappMessage(whatsappPhoneNumber, 'Test message from Cafe Management System');
      alert('WhatsApp test message sent successfully!');
    } catch (error) {
      console.error('WhatsApp test error:', error);
      alert(`WhatsApp test failed: ${error.message}`);
    }
  };

  // SMS functions
  const saveSmsSettings = async () => {
    try {
      const res = await fetch(`${API}/sms/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: smsEnabled,
          provider: smsProvider,
          apiKey: smsApiKey,
          apiSecret: smsApiSecret,
          phoneNumber: smsPhoneNumber
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSmsCredits(data.settings.credits);
        setSmsUsed(data.settings.used);
        alert('SMS settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving SMS settings:', error);
      alert('Error saving SMS settings');
    }
  };

  const sendSmsMessage = async (phone: string, message: string) => {
    const res = await fetch(`${API}/sms/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to send SMS message');
    }
    
    const result = await res.json();
    if (result.success) {
      // Refresh settings to get updated credit count
      loadSmsSettings();
      return true;
    } else {
      throw new Error(result.message || 'Failed to send SMS message');
    }
  };

  const testSmsConnection = async () => {
    try {
      await sendSmsMessage(smsPhoneNumber, 'Test SMS from Cafe Management System');
      alert('SMS test message sent successfully!');
    } catch (error) {
      console.error('SMS test error:', error);
      alert(`SMS test failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-medium">Loading admin dashboard…</h3>
        <p className="text-sm text-muted-foreground mt-2">Fetching system statistics</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateTestBills} variant="outline" size="sm">
            <Database className="w-4 h-4 mr-2" />
            Generate Test Bills
          </Button>
          <Button onClick={seedMenu} variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Seed Menu
          </Button>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pending, {stats.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Today's earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tables</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTables}</div>
            <p className="text-xs text-muted-foreground">Currently occupied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Served today</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Reports</CardTitle>
              <CardDescription>
                View detailed sales and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DailyReport />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending Orders</span>
                  <Badge variant="secondary">{stats.pendingOrders}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Completed Orders</span>
                  <Badge variant="default">{stats.completedOrders}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Preparing</span>
                  <Badge variant="outline">0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ready</span>
                  <Badge variant="outline">0</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed revenue analysis coming soon
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{(stats.totalRevenue * 0.93).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (5%)</span>
                    <span>₹{(stats.totalRevenue * 0.05).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service (2%)</span>
                    <span>₹{(stats.totalRevenue * 0.02).toFixed(0)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>₹{stats.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Management</CardTitle>
                <CardDescription>
                  Administrative functions and maintenance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={seedMenu} className="w-full" variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  Re-seed Menu Data
                </Button>
                <Button onClick={generateTestBills} className="w-full" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Test Bills
                </Button>
                <Button className="w-full" variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings (Coming Soon)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Backend API</span>
                    <Badge variant="default">Running</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Database</span>
                    <Badge variant="secondary">In-Memory</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">WebSocket</span>
                    <Badge variant="outline">Disabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                WhatsApp Integration
              </CardTitle>
              <CardDescription>
                Configure WhatsApp messaging for OTP and bills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* WhatsApp Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">WhatsApp Messaging</h4>
                  <p className="text-sm text-muted-foreground">
                    Send OTP codes and bills via WhatsApp
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={whatsappEnabled}
                    onCheckedChange={setWhatsappEnabled}
                  />
                  {whatsappEnabled ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>

              {/* Credits Usage */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Free Credits</p>
                        <p className="text-2xl font-bold">{whatsappCredits - whatsappUsed}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="text-2xl font-bold">{whatsappUsed}</p>
                      </div>
                      <MessageSquare className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Usage</p>
                        <p className="text-2xl font-bold">
                          {whatsappCredits > 0 ? Math.round((whatsappUsed / whatsappCredits) * 100) : 0}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* WhatsApp Configuration */}
              <div className="space-y-4">
                <h4 className="font-medium">Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-api-key">WhatsApp API Key</Label>
                    <Input
                      id="whatsapp-api-key"
                      type="password"
                      placeholder="Enter your WhatsApp API key"
                      value={whatsappApiKey}
                      onChange={(e) => setWhatsappApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your API key from WhatsApp Business API
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-phone">Business Phone Number</Label>
                    <Input
                      id="whatsapp-phone"
                      placeholder="+1234567890"
                      value={whatsappPhoneNumber}
                      onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your WhatsApp Business phone number
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={saveWhatsappSettings}>
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={testWhatsappConnection}
                  disabled={!whatsappEnabled || !whatsappApiKey || !whatsappPhoneNumber}
                >
                  Test Connection
                </Button>
              </div>

              {/* Setup Instructions */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="font-medium">1. Get WhatsApp Business API Access</h5>
                    <p className="text-sm text-muted-foreground">
                      Visit <a href="https://developers.facebook.com/docs/whatsapp/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Facebook Developers</a> and create a WhatsApp Business account.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">2. Get Your API Key</h5>
                    <p className="text-sm text-muted-foreground">
                      Generate an access token from your WhatsApp Business app dashboard.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">3. Configure Phone Number</h5>
                    <p className="text-sm text-muted-foreground">
                      Add and verify your business phone number in the WhatsApp dashboard.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">4. Free Tier Limits</h5>
                    <p className="text-sm text-muted-foreground">
                      WhatsApp Business API free tier includes 1,000 messages per month. Upgrade for higher limits.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Integration
              </CardTitle>
              <CardDescription>
                Configure SMS messaging for OTP and bills using various providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SMS Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">SMS Messaging</h4>
                  <p className="text-sm text-muted-foreground">
                    Send OTP codes and bills via SMS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={smsEnabled}
                    onCheckedChange={setSmsEnabled}
                  />
                  {smsEnabled ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>

              {/* Credit Usage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{smsCredits - smsUsed}</div>
                  <div className="text-sm text-muted-foreground">SMS Credits Remaining</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{smsUsed}</div>
                  <div className="text-sm text-muted-foreground">SMS Used This Month</div>
                </div>
              </div>

              {/* SMS Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sms-provider">SMS Provider</Label>
                  <select
                    id="sms-provider"
                    className="w-full p-2 border rounded-md"
                    value={smsProvider}
                    onChange={(e) => setSmsProvider(e.target.value)}
                  >
                    {availableSmsProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Choose your SMS service provider
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-apikey">API Key</Label>
                  <Input
                    id="sms-apikey"
                    type="password"
                    placeholder="Your API key"
                    value={smsApiKey}
                    onChange={(e) => setSmsApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    API key from your SMS provider
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-apisecret">API Secret (if required)</Label>
                  <Input
                    id="sms-apisecret"
                    type="password"
                    placeholder="Your API secret"
                    value={smsApiSecret}
                    onChange={(e) => setSmsApiSecret(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for some providers like Twilio
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sms-phone">Sender Phone Number</Label>
                  <Input
                    id="sms-phone"
                    placeholder="+1234567890"
                    value={smsPhoneNumber}
                    onChange={(e) => setSmsPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your sender phone number
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={saveSmsSettings}>
                  Save Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={testSmsConnection}
                  disabled={!smsEnabled || !smsApiKey || !smsPhoneNumber}
                >
                  Test Connection
                </Button>
              </div>

              {/* Setup Instructions */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg">Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h5 className="font-medium">1. Choose SMS Provider</h5>
                    <p className="text-sm text-muted-foreground">
                      Select from supported providers: Twilio, AWS SNS, MessageBird, or Nexmo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">2. Get API Credentials</h5>
                    <p className="text-sm text-muted-foreground">
                      Sign up with your chosen provider and get your API key and secret.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">3. Configure Phone Number</h5>
                    <p className="text-sm text-muted-foreground">
                      Purchase or configure a sender phone number from your provider.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-medium">4. Pricing</h5>
                    <p className="text-sm text-muted-foreground">
                      SMS costs vary by provider and region. Start with small credit amounts.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};