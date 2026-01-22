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

const BSA_SERVICES: ProductItem[] = [
  // Customer Experience
  {
    id: "cs-agent",
    name: "Customer Support Agent",
    category: "Customer Experience",
    basePrice: 2250,
    description: "Dedicated customer service representative (monthly)",
    features: ["Phone Support", "Email Support", "Chat Support", "Ticket Management", "24/7 Coverage Option"]
  },
  {
    id: "cs-team-lead",
    name: "Customer Support Team Lead",
    category: "Customer Experience",
    basePrice: 3200,
    description: "Senior agent to manage and mentor support team (monthly)",
    features: ["Team Supervision", "Quality Assurance", "Escalation Handling", "Performance Reporting"]
  },
  // Administrative Support
  {
    id: "va-general",
    name: "Virtual Assistant",
    category: "Administrative",
    basePrice: 1800,
    description: "Executive/administrative assistant (monthly)",
    features: ["Calendar Management", "Email Management", "Travel Booking", "Research Tasks", "Document Prep"]
  },
  {
    id: "va-executive",
    name: "Executive Virtual Assistant",
    category: "Administrative",
    basePrice: 2500,
    description: "Senior VA with advanced skills (monthly)",
    features: ["All VA Features", "Project Coordination", "Meeting Prep", "Stakeholder Communication"]
  },
  // Finance Operations
  {
    id: "bookkeeper",
    name: "Bookkeeper",
    category: "Finance",
    basePrice: 2200,
    description: "QuickBooks/Xero bookkeeping professional (monthly)",
    features: ["AP/AR Management", "Bank Reconciliation", "Invoice Processing", "Monthly Reports"]
  },
  {
    id: "accountant",
    name: "Staff Accountant",
    category: "Finance",
    basePrice: 3000,
    description: "Full-charge accounting professional (monthly)",
    features: ["All Bookkeeper Features", "Financial Statements", "Month-End Close", "Variance Analysis"]
  },
  {
    id: "financial-analyst",
    name: "Financial Analyst",
    category: "Finance",
    basePrice: 3500,
    description: "FP&A and financial modeling specialist (monthly)",
    features: ["Financial Modeling", "Budgeting & Forecasting", "KPI Tracking", "Management Reporting"]
  },
  // Technology
  {
    id: "developer-junior",
    name: "Junior Developer",
    category: "Technology",
    basePrice: 2800,
    description: "Entry-level full-stack developer (monthly)",
    features: ["Frontend Development", "Backend Development", "Code Review", "Documentation"]
  },
  {
    id: "developer-mid",
    name: "Mid-Level Developer",
    category: "Technology",
    basePrice: 4000,
    description: "Experienced software developer (monthly)",
    features: ["All Junior Features", "Architecture Input", "Technical Leadership", "Mentoring"]
  },
  {
    id: "developer-senior",
    name: "Senior Developer",
    category: "Technology",
    basePrice: 5500,
    description: "Senior engineer with 5+ years experience (monthly)",
    features: ["All Mid Features", "System Design", "Code Standards", "Sprint Leadership"]
  },
  {
    id: "qa-engineer",
    name: "QA Engineer",
    category: "Technology",
    basePrice: 2500,
    description: "Manual and automated testing specialist (monthly)",
    features: ["Test Planning", "Manual Testing", "Automation Scripts", "Bug Reporting"]
  },
  // Marketing & Creative
  {
    id: "social-media-manager",
    name: "Social Media Manager",
    category: "Marketing",
    basePrice: 2000,
    description: "Social media content and engagement specialist (monthly)",
    features: ["Content Creation", "Community Management", "Analytics", "Campaign Management"]
  },
  {
    id: "content-writer",
    name: "Content Writer",
    category: "Marketing",
    basePrice: 1800,
    description: "Blog, web, and marketing content writer (monthly)",
    features: ["Blog Posts", "Web Copy", "Email Content", "SEO Optimization"]
  },
  {
    id: "graphic-designer",
    name: "Graphic Designer",
    category: "Creative",
    basePrice: 2200,
    description: "Visual design for marketing and branding (monthly)",
    features: ["Social Graphics", "Marketing Materials", "Brand Assets", "Presentation Design"]
  },
  {
    id: "video-editor",
    name: "Video Editor",
    category: "Creative",
    basePrice: 2500,
    description: "Video production and editing specialist (monthly)",
    features: ["Video Editing", "Motion Graphics", "Color Correction", "Content Repurposing"]
  },
  // E-Commerce
  {
    id: "ecom-specialist",
    name: "E-Commerce Specialist",
    category: "E-Commerce",
    basePrice: 2000,
    description: "Product listing and marketplace management (monthly)",
    features: ["Product Listings", "Inventory Updates", "Catalog Management", "Order Processing"]
  },
  {
    id: "amazon-specialist",
    name: "Amazon Specialist",
    category: "E-Commerce",
    basePrice: 2500,
    description: "Amazon Seller Central expert (monthly)",
    features: ["Listing Optimization", "PPC Management", "Review Management", "Inventory Planning"]
  },
  // Data & Back Office
  {
    id: "data-entry",
    name: "Data Entry Specialist",
    category: "Back Office",
    basePrice: 1400,
    description: "High-volume data processing (monthly)",
    features: ["Data Entry", "Data Cleansing", "Document Processing", "Database Updates"]
  },
  // Sales & HR
  {
    id: "sdr",
    name: "Sales Development Rep",
    category: "Sales",
    basePrice: 2500,
    description: "Outbound prospecting and lead qualification (monthly)",
    features: ["Cold Calling", "Email Outreach", "Lead Research", "Meeting Setting"]
  },
  {
    id: "recruiter",
    name: "Recruiter",
    category: "HR",
    basePrice: 2500,
    description: "Talent sourcing and recruiting support (monthly)",
    features: ["Sourcing", "Screening", "Interview Scheduling", "ATS Management"]
  },
  // Setup & Onboarding
  {
    id: "setup-fee",
    name: "Team Setup Fee",
    category: "Setup",
    basePrice: 500,
    description: "One-time onboarding and setup per team member",
    features: ["Recruitment", "Onboarding", "Training Setup", "Tool Configuration"]
  },
  {
    id: "training-custom",
    name: "Custom Training Program",
    category: "Setup",
    basePrice: 1500,
    description: "Tailored training development (one-time)",
    features: ["Process Documentation", "Training Materials", "Knowledge Transfer", "Certification"]
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

const categories = ["All", "Customer Experience", "Administrative", "Finance", "Technology", "Marketing", "Creative", "E-Commerce", "Back Office", "Sales", "HR", "Setup"];

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
    return BSA_SERVICES.filter(p => {
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
      "=== BSA SOLUTIONS BUDGET ESTIMATE ===",
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
          <Badge variant="secondary">BSA Services</Badge>
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
              placeholder="Search services..."
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
