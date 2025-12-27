import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, Plus, Minus, Copy, TrendingDown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface ProductItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  shortName: string;
}

interface LineItem {
  product: ProductItem;
  quantity: number;
}

const QUICK_PRODUCTS: ProductItem[] = [
  { id: "sw-standard", name: "SOLIDWORKS Standard", category: "CAD", basePrice: 3995, shortName: "SW Std" },
  { id: "sw-professional", name: "SOLIDWORKS Professional", category: "CAD", basePrice: 5490, shortName: "SW Pro" },
  { id: "sw-premium", name: "SOLIDWORKS Premium", category: "CAD", basePrice: 7995, shortName: "SW Prem" },
  { id: "sw-subscription", name: "Annual Subscription", category: "Sub", basePrice: 1295, shortName: "Sub" },
  { id: "pdm-standard", name: "PDM Standard", category: "PDM", basePrice: 1995, shortName: "PDM Std" },
  { id: "pdm-professional", name: "PDM Professional", category: "PDM", basePrice: 3495, shortName: "PDM Pro" },
  { id: "cam-standard", name: "CAMWorks Standard", category: "CAM", basePrice: 4995, shortName: "CAM Std" },
  { id: "sim-standard", name: "Simulation Standard", category: "Sim", basePrice: 3995, shortName: "Sim Std" },
  { id: "training-essentials", name: "Essentials Training", category: "Train", basePrice: 1995, shortName: "Training" },
  { id: "support-bronze", name: "Bronze Support", category: "Svc", basePrice: 2995, shortName: "Support" },
];

const DISCOUNT_OPTIONS = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
];

interface BudgetingPanelProps {
  compact?: boolean;
}

export function BudgetingPanel({ compact = true }: BudgetingPanelProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const addProduct = (product: ProductItem) => {
    const existing = lineItems.find(li => li.product.id === product.id);
    if (existing) {
      setLineItems(lineItems.map(li =>
        li.product.id === product.id ? { ...li, quantity: li.quantity + 1 } : li
      ));
    } else {
      setLineItems([...lineItems, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setLineItems(lineItems.map(li => {
      if (li.product.id === productId) {
        const newQty = Math.max(0, li.quantity + delta);
        return { ...li, quantity: newQty };
      }
      return li;
    }).filter(li => li.quantity > 0));
  };

  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + (li.product.basePrice * li.quantity), 0);
    const discountAmount = subtotal * globalDiscount / 100;
    const total = subtotal - discountAmount;
    
    return { subtotal, discountAmount, total };
  }, [lineItems, globalDiscount]);

  const copyQuickQuote = () => {
    const lines = [
      "Quick Budget Estimate:",
      ...lineItems.map(li => `${li.quantity}x ${li.product.name} @ $${li.product.basePrice.toLocaleString()} = $${(li.product.basePrice * li.quantity).toLocaleString()}`),
      globalDiscount > 0 ? `Discount: ${globalDiscount}% off` : "",
      `Total: $${calculations.total.toLocaleString()}`,
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copied!", description: "Quote copied to clipboard" });
  };

  return (
    <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 text-green-900 dark:text-green-100">
            <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-md">
              <Calculator className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            Quick Budget
          </CardTitle>
          <div className="flex items-center gap-1">
            <Select value={String(globalDiscount)} onValueChange={(v) => setGlobalDiscount(Number(v))}>
              <SelectTrigger className="h-7 w-16 text-xs" data-testid="select-panel-discount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCOUNT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/budgeting">
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-open-full-budgeting">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-1">
          {QUICK_PRODUCTS.map(product => (
            <Button
              key={product.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2 bg-white dark:bg-green-950/50 border-green-200 dark:border-green-800"
              onClick={() => addProduct(product)}
              data-testid={`button-quick-add-${product.id}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              {product.shortName}
            </Button>
          ))}
        </div>

        {lineItems.length > 0 && (
          <>
            <ScrollArea className="max-h-[120px]">
              <div className="space-y-1 pr-2">
                {lineItems.map(li => (
                  <div key={li.product.id} className="flex items-center justify-between gap-2 text-sm p-1.5 bg-white dark:bg-green-950/50 rounded border border-green-200 dark:border-green-800">
                    <span className="truncate flex-1 text-xs">{li.product.shortName}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateQuantity(li.product.id, -1)} data-testid={`button-minus-${li.product.id}`}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center text-xs font-medium">{li.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateQuantity(li.product.id, 1)} data-testid={`button-plus-${li.product.id}`}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="w-16 text-right text-xs font-medium">
                        ${(li.product.basePrice * li.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="bg-green-200 dark:bg-green-800" />

            <div className="flex items-center justify-between text-sm">
              <div>
                {calculations.discountAmount > 0 && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                    <TrendingDown className="h-3 w-3" />
                    Save ${calculations.discountAmount.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-900 dark:text-green-100">
                  ${calculations.total.toLocaleString()}
                </span>
                <Button size="sm" variant="outline" className="h-7 border-green-300 dark:border-green-700" onClick={copyQuickQuote} data-testid="button-copy-quick-quote">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}

        {lineItems.length === 0 && (
          <p className="text-xs text-green-700 dark:text-green-300 text-center py-2">
            Click products above to build a quick quote
          </p>
        )}
      </CardContent>
    </Card>
  );
}
