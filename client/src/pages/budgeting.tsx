import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, Package, Printer, BookOpen, Wrench, DollarSign, TrendingDown, Copy, FileText, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  features?: string[];
}

interface LineItem {
  product: ProductItem;
  quantity: number;
  discount: number;
}

const HAWK_RIDGE_PRODUCTS: ProductItem[] = [
  {
    id: "sw-standard",
    name: "SOLIDWORKS Standard",
    category: "CAD Software",
    basePrice: 3995,
    description: "Essential 3D CAD with part/assembly modeling, 2D drawings",
    features: ["Part & Assembly Modeling", "2D Drawings", "Basic Simulation", "eDrawings"]
  },
  {
    id: "sw-professional",
    name: "SOLIDWORKS Professional",
    category: "CAD Software",
    basePrice: 5490,
    description: "Advanced features including PDM, rendering, and toolbox",
    features: ["All Standard Features", "SOLIDWORKS PDM Standard", "PhotoView 360", "Toolbox", "Task Scheduler"]
  },
  {
    id: "sw-premium",
    name: "SOLIDWORKS Premium",
    category: "CAD Software",
    basePrice: 7995,
    description: "Complete design solution with simulation and routing",
    features: ["All Professional Features", "Advanced Simulation", "Routing (Piping/Tubing)", "Motion Analysis", "Tolerance Analysis"]
  },
  {
    id: "sw-subscription",
    name: "SOLIDWORKS Annual Subscription",
    category: "Subscription",
    basePrice: 1295,
    description: "Annual maintenance and support per license",
    features: ["Software Updates", "Technical Support", "Online Resources", "Service Packs"]
  },
  {
    id: "pdm-standard",
    name: "PDM Standard (CAD Editor)",
    category: "Data Management",
    basePrice: 1995,
    description: "Document management for CAD users",
    features: ["Version Control", "Check-in/Check-out", "Revision Management", "BOM Management"]
  },
  {
    id: "pdm-professional",
    name: "PDM Professional (CAD Editor)",
    category: "Data Management",
    basePrice: 3495,
    description: "Enterprise data management with workflows",
    features: ["All Standard Features", "Automated Workflows", "SQL Database", "Web2 Client", "API Access"]
  },
  {
    id: "pdm-contributor",
    name: "PDM Contributor License",
    category: "Data Management",
    basePrice: 695,
    description: "View and markup access for non-CAD users",
    features: ["View Files", "Markup & Redline", "Search", "Basic Workflows"]
  },
  {
    id: "cam-standard",
    name: "CAMWorks Standard",
    category: "CAM Software",
    basePrice: 4995,
    description: "2.5-axis milling and turning",
    features: ["2.5-Axis Milling", "Turning", "Feature Recognition", "Associative Machining"]
  },
  {
    id: "cam-professional",
    name: "CAMWorks Professional",
    category: "CAM Software",
    basePrice: 7495,
    description: "Multi-axis milling with advanced toolpaths",
    features: ["All Standard Features", "3-Axis Milling", "4/5-Axis Indexing", "Advanced Toolpaths"]
  },
  {
    id: "sim-standard",
    name: "SOLIDWORKS Simulation Standard",
    category: "Simulation",
    basePrice: 3995,
    description: "Linear static stress analysis",
    features: ["Static Analysis", "Motion Analysis", "Fatigue Analysis", "Trend Tracker"]
  },
  {
    id: "sim-professional",
    name: "SOLIDWORKS Simulation Professional",
    category: "Simulation",
    basePrice: 7995,
    description: "Advanced analysis including thermal and frequency",
    features: ["All Standard Features", "Thermal Analysis", "Frequency Analysis", "Buckling", "Drop Test"]
  },
  {
    id: "sim-premium",
    name: "SOLIDWORKS Simulation Premium",
    category: "Simulation",
    basePrice: 12995,
    description: "Nonlinear and dynamics simulation",
    features: ["All Professional Features", "Nonlinear Analysis", "Dynamic Analysis", "Composite Analysis"]
  },
  {
    id: "printer-f170",
    name: "Stratasys F170",
    category: "3D Printing",
    basePrice: 19900,
    description: "Entry-level industrial FDM printer",
    features: ["254 x 254 x 254mm Build", "PLA & ASA Materials", "GrabCAD Print", "Remote Monitoring"]
  },
  {
    id: "printer-f370",
    name: "Stratasys F370",
    category: "3D Printing",
    basePrice: 49900,
    description: "Mid-range FDM with larger build volume",
    features: ["355 x 254 x 355mm Build", "Engineering Materials", "Soluble Supports", "Network Ready"]
  },
  {
    id: "printer-j55",
    name: "Stratasys J55",
    category: "3D Printing",
    basePrice: 99000,
    description: "Full-color PolyJet desktop printer",
    features: ["1174 x 132mm Build", "Full Color", "Multi-Material", "Office-Friendly"]
  },
  {
    id: "scanner-gom",
    name: "GOM ATOS Q 3D Scanner",
    category: "3D Scanning",
    basePrice: 75000,
    description: "High-precision blue light scanner",
    features: ["Blue Light Technology", "Automated Inspection", "GOM Inspect Software", "High Accuracy"]
  },
  {
    id: "training-essentials",
    name: "SOLIDWORKS Essentials Training",
    category: "Training",
    basePrice: 1995,
    description: "4-day instructor-led fundamentals course",
    features: ["4 Days", "Instructor-Led", "Certification Prep", "Hands-on Exercises"]
  },
  {
    id: "training-advanced",
    name: "Advanced Training Package",
    category: "Training",
    basePrice: 3495,
    description: "Specialized training (Surfacing, Weldments, etc.)",
    features: ["Specialized Topics", "Certification Track", "Project-Based", "Best Practices"]
  },
  {
    id: "support-bronze",
    name: "Bronze Support Package",
    category: "Support",
    basePrice: 2995,
    description: "Annual priority technical support",
    features: ["Phone Support", "Email Support", "Knowledge Base", "Standard Response"]
  },
  {
    id: "support-silver",
    name: "Silver Support Package",
    category: "Support",
    basePrice: 5995,
    description: "Enhanced support with faster response",
    features: ["All Bronze Features", "Priority Response", "Remote Sessions", "Quarterly Check-ins"]
  },
  {
    id: "support-gold",
    name: "Gold Support Package",
    category: "Support",
    basePrice: 9995,
    description: "Premium dedicated support with on-site visits",
    features: ["All Silver Features", "Dedicated Rep", "On-Site Visits", "Custom Training"]
  },
  {
    id: "implementation",
    name: "Implementation Services",
    category: "Services",
    basePrice: 4995,
    description: "Professional deployment and configuration",
    features: ["Installation", "Configuration", "Data Migration", "User Setup"]
  }
];

const DISCOUNT_TIERS = [
  { label: "Standard", value: 0 },
  { label: "5% Volume", value: 5 },
  { label: "10% Volume", value: 10 },
  { label: "15% Enterprise", value: 15 },
  { label: "20% Strategic", value: 20 },
  { label: "25% Max (Approval Required)", value: 25 }
];

const PAYMENT_TERMS = [
  { label: "Net 30", value: "net30", multiplier: 1.0 },
  { label: "Net 60", value: "net60", multiplier: 1.02 },
  { label: "12-Month Financing", value: "12mo", multiplier: 1.08, monthly: true },
  { label: "24-Month Financing", value: "24mo", multiplier: 1.12, monthly: true },
  { label: "36-Month Financing", value: "36mo", multiplier: 1.15, monthly: true }
];

const categories = ["All", "CAD Software", "Data Management", "CAM Software", "Simulation", "3D Printing", "3D Scanning", "Training", "Support", "Services", "Subscription"];

export default function BudgetingPage() {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentTerm, setPaymentTerm] = useState("net30");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductDetails, setShowProductDetails] = useState<string | null>(null);
  const [includeSubscription, setIncludeSubscription] = useState(true);

  const filteredProducts = useMemo(() => {
    return HAWK_RIDGE_PRODUCTS.filter(p => {
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const addToQuote = (product: ProductItem) => {
    const existing = lineItems.find(li => li.product.id === product.id);
    if (existing) {
      setLineItems(lineItems.map(li =>
        li.product.id === product.id ? { ...li, quantity: li.quantity + 1 } : li
      ));
    } else {
      setLineItems([...lineItems, { product, quantity: 1, discount: globalDiscount }]);
    }
    toast({ title: "Added to quote", description: product.name });
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

  const updateItemDiscount = (productId: string, discount: number) => {
    setLineItems(lineItems.map(li =>
      li.product.id === productId ? { ...li, discount } : li
    ));
  };

  const applyGlobalDiscount = () => {
    setLineItems(lineItems.map(li => ({ ...li, discount: globalDiscount })));
    toast({ title: "Discount applied", description: `${globalDiscount}% discount applied to all items` });
  };

  const clearQuote = () => {
    setLineItems([]);
    toast({ title: "Quote cleared" });
  };

  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => {
      return sum + (li.product.basePrice * li.quantity);
    }, 0);

    const discountAmount = lineItems.reduce((sum, li) => {
      return sum + (li.product.basePrice * li.quantity * li.discount / 100);
    }, 0);

    const afterDiscount = subtotal - discountAmount;

    const selectedPayment = PAYMENT_TERMS.find(p => p.value === paymentTerm) || PAYMENT_TERMS[0];
    const financingCost = afterDiscount * (selectedPayment.multiplier - 1);
    const total = afterDiscount + financingCost;

    const cadLicenses = lineItems.filter(li => li.product.category === "CAD Software").reduce((sum, li) => sum + li.quantity, 0);
    const annualSubscription = includeSubscription && cadLicenses > 0 ? cadLicenses * 1295 : 0;

    let monthlyPayment = 0;
    if (selectedPayment.monthly) {
      const months = parseInt(selectedPayment.value.replace("mo", ""));
      monthlyPayment = total / months;
    }

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      financingCost,
      total,
      totalWithSubscription: total + annualSubscription,
      annualSubscription,
      monthlyPayment,
      cadLicenses,
      savingsPercent: subtotal > 0 ? (discountAmount / subtotal * 100).toFixed(1) : 0
    };
  }, [lineItems, paymentTerm, includeSubscription]);

  const generateQuoteSummary = () => {
    const lines = [
      "=== HAWK RIDGE SYSTEMS BUDGET ESTIMATE ===",
      "",
      "PRODUCTS:",
      ...lineItems.map(li => 
        `  ${li.quantity}x ${li.product.name} @ $${li.product.basePrice.toLocaleString()} (${li.discount}% off) = $${((li.product.basePrice * li.quantity) * (1 - li.discount/100)).toLocaleString()}`
      ),
      "",
      `Subtotal: $${calculations.subtotal.toLocaleString()}`,
      `Discount: -$${calculations.discountAmount.toLocaleString()} (${calculations.savingsPercent}%)`,
      `After Discount: $${calculations.afterDiscount.toLocaleString()}`,
      calculations.financingCost > 0 ? `Financing Cost: +$${calculations.financingCost.toLocaleString()}` : "",
      `Total: $${calculations.total.toLocaleString()}`,
      calculations.annualSubscription > 0 ? `Annual Subscription: +$${calculations.annualSubscription.toLocaleString()}/year` : "",
      calculations.monthlyPayment > 0 ? `Monthly Payment: $${calculations.monthlyPayment.toLocaleString()}/month` : "",
      "",
      `Payment Terms: ${PAYMENT_TERMS.find(p => p.value === paymentTerm)?.label}`,
      "",
      "Generated: " + new Date().toLocaleString()
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Quote copied!", description: "Summary copied to clipboard" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Budgeting Tool</h1>
          <Badge variant="secondary">Hawk Ridge Portfolio</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearQuote} data-testid="button-clear-quote">
            Clear Quote
          </Button>
          <Button size="sm" onClick={generateQuoteSummary} data-testid="button-copy-quote">
            <Copy className="h-4 w-4 mr-2" />
            Copy Quote
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30 space-y-3">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              data-testid="input-search-products"
            />
            <ScrollArea className="w-full">
              <div className="flex gap-1 pb-1">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "ghost"}
                    size="sm"
                    className="whitespace-nowrap text-xs"
                    onClick={() => setSelectedCategory(cat)}
                    data-testid={`button-category-${cat.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredProducts.map(product => (
                <Card 
                  key={product.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setShowProductDetails(showProductDetails === product.id ? null : product.id)}
                  data-testid={`card-product-${product.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{product.name}</span>
                          <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.description}</p>
                        
                        {showProductDetails === product.id && product.features && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs font-medium mb-1">Features:</p>
                            <div className="flex flex-wrap gap-1">
                              {product.features.map(f => (
                                <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-sm">${product.basePrice.toLocaleString()}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); addToQuote(product); }}
                          data-testid={`button-add-${product.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Global Discount:</Label>
                <Select value={String(globalDiscount)} onValueChange={(v) => setGlobalDiscount(Number(v))}>
                  <SelectTrigger className="w-40 h-8" data-testid="select-global-discount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TIERS.map(tier => (
                      <SelectItem key={tier.value} value={String(tier.value)}>{tier.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={applyGlobalDiscount} data-testid="button-apply-discount">
                  Apply All
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {lineItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items in quote</p>
                  <p className="text-sm">Click products to add them</p>
                </div>
              ) : (
                lineItems.map(li => (
                  <Card key={li.product.id} data-testid={`lineitem-${li.product.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{li.product.name}</p>
                          <p className="text-xs text-muted-foreground">${li.product.basePrice.toLocaleString()} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={String(li.discount)} 
                            onValueChange={(v) => updateItemDiscount(li.product.id, Number(v))}
                          >
                            <SelectTrigger className="w-24 h-8" data-testid={`select-discount-${li.product.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISCOUNT_TIERS.map(tier => (
                                <SelectItem key={tier.value} value={String(tier.value)}>{tier.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(li.product.id, -1)}
                              data-testid={`button-minus-${li.product.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{li.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(li.product.id, 1)}
                              data-testid={`button-plus-${li.product.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="w-24 text-right font-semibold">
                            ${((li.product.basePrice * li.quantity) * (1 - li.discount/100)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Payment Terms:</Label>
                <Select value={paymentTerm} onValueChange={setPaymentTerm}>
                  <SelectTrigger className="w-44 h-8" data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map(term => (
                      <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {calculations.cadLicenses > 0 && (
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={includeSubscription} 
                    onCheckedChange={setIncludeSubscription}
                    data-testid="switch-subscription"
                  />
                  <Label className="text-sm">Include Annual Subscription</Label>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${calculations.subtotal.toLocaleString()}</span>
              </div>
              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Savings ({calculations.savingsPercent}%):
                  </span>
                  <span>-${calculations.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {calculations.financingCost > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Financing:</span>
                  <span>+${calculations.financingCost.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total:</span>
                <span>${calculations.total.toLocaleString()}</span>
              </div>
              {calculations.annualSubscription > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Annual Subscription:</span>
                  <span>${calculations.annualSubscription.toLocaleString()}/year</span>
                </div>
              )}
              {calculations.monthlyPayment > 0 && (
                <div className="flex justify-between font-medium text-primary">
                  <span>Monthly Payment:</span>
                  <span>${Math.round(calculations.monthlyPayment).toLocaleString()}/mo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
