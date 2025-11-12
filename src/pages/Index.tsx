import { Link } from "react-router-dom";
import { ChefHat, ShoppingBag } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Cafe Order System</h1>
          <p className="text-muted-foreground text-lg">
            Choose your interface to get started
          </p>
        </div>
        <div className="grid gap-6">
          <Link to="/customer" className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 transition-all hover:border-primary hover:shadow-lg w-full block text-left">
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                <ShoppingBag className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Customer App</h2>
              <p className="text-muted-foreground">
                Browse menu, add items to cart, and place your order
              </p>
            </div>
          </Link>
          <div className="text-center">
            <a href="/customer" target="_blank" className="text-sm text-primary underline">Open Customer in new tab</a>
          </div>
          <Link to="/kitchen" className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 transition-all hover:border-secondary hover:shadow-lg w-full block text-left">
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto group-hover:bg-secondary/20 transition-colors">
                <ChefHat className="w-10 h-10 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold">Kitchen Dashboard</h2>
              <p className="text-muted-foreground">
                Manage orders, update status, and process bills
              </p>
            </div>
          </Link>
          <div className="text-center">
            <a href="/kitchen" target="_blank" className="text-sm text-secondary underline">Open Kitchen in new tab</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
