import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { 
  Users, 
  Phone, 
  FileSearch, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function MetricCard({ title, value, description, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold" data-testid={`metric-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
              {trend.value}%
            </span>
            <span className="text-sm text-muted-foreground">vs last week</span>
          </div>
        )}
        {description && !trend && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  type: "call" | "research" | "lead";
  title: string;
  description: string;
  time: string;
  status: "completed" | "in_progress" | "pending";
}

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    type: "call",
    title: "Call with Acme Corp",
    description: "Discussed product requirements",
    time: "10 min ago",
    status: "completed",
  },
  {
    id: "2",
    type: "research",
    title: "Research: TechStart Inc",
    description: "AI research completed - 85% fit score",
    time: "25 min ago",
    status: "completed",
  },
  {
    id: "3",
    type: "lead",
    title: "New lead assigned",
    description: "Global Systems LLC - Manufacturing",
    time: "1 hour ago",
    status: "pending",
  },
  {
    id: "4",
    type: "call",
    title: "Scheduled: Innovate Labs",
    description: "Discovery call at 3:00 PM",
    time: "In 2 hours",
    status: "pending",
  },
];

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "research":
      return <FileSearch className="h-4 w-4" />;
    case "lead":
      return <Users className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    completed: { label: "Completed", variant: "default" },
    in_progress: { label: "In Progress", variant: "secondary" },
    pending: { label: "Pending", variant: "outline" },
  };
  
  const { label, variant } = variants[status] || variants.pending;
  
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold" data-testid="text-greeting">
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your sales pipeline today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={127}
          icon={<Users className="h-5 w-5" />}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Calls Today"
          value={8}
          icon={<Phone className="h-5 w-5" />}
          trend={{ value: 5, isPositive: true }}
        />
        <MetricCard
          title="Research Completed"
          value={24}
          icon={<FileSearch className="h-5 w-5" />}
          trend={{ value: 18, isPositive: true }}
        />
        <MetricCard
          title="Conversion Rate"
          value="23%"
          icon={<TrendingUp className="h-5 w-5" />}
          trend={{ value: 3, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </div>
            <Button variant="outline" size="sm" data-testid="button-view-all">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-4 p-3 rounded-md hover-elevate"
                  data-testid={`activity-item-${item.id}`}
                >
                  <div className="p-2 rounded-md bg-muted">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-new-call">
              <Phone className="h-4 w-4" />
              Start New Call
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-add-lead">
              <Users className="h-4 w-4" />
              Add New Lead
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-research">
              <FileSearch className="h-4 w-4" />
              Research Lead
            </Button>
            <Button className="w-full justify-start gap-2 bg-[#2C88C9] hover:bg-[#2C88C9]/90" data-testid="button-import">
              <Zap className="h-4 w-4" />
              Import from Sheets
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Top Leads</CardTitle>
            <CardDescription>Highest fit score leads ready for outreach</CardDescription>
          </div>
          <Button variant="outline" size="sm" data-testid="button-view-leads">
            View all leads
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Industry</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fit Score</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { company: "Acme Manufacturing", contact: "John Smith", industry: "Manufacturing", score: 92, status: "new" },
                  { company: "TechStart Inc", contact: "Sarah Johnson", industry: "Technology", score: 88, status: "researched" },
                  { company: "Global Aerospace", contact: "Mike Chen", industry: "Aerospace", score: 85, status: "contacted" },
                  { company: "Precision Tools", contact: "Emily Brown", industry: "Industrial", score: 82, status: "new" },
                ].map((lead, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <span className="font-medium">{lead.company}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.contact}</td>
                    <td className="py-3 px-2 text-muted-foreground">{lead.industry}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#2C88C9] rounded-full" 
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{lead.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={lead.status === "new" ? "outline" : lead.status === "researched" ? "secondary" : "default"}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button size="sm" variant="ghost">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
