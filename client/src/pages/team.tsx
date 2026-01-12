import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  User,
  ChevronDown,
  Mail,
  Building2,
  Loader2,
  FolderSync,
  Pencil,
  Trash2,
  Plus,
  Briefcase,
  Phone,
  MapPin,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import type { Manager, Sdr, AccountExecutive } from "@shared/schema";

interface TeamData {
  teamByManager: { manager: Manager; sdrs: Sdr[] }[];
  unassignedSdrs: Sdr[];
  totalManagers: number;
  totalSdrs: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface EditSdrDialogProps {
  sdr: Sdr | null;
  isOpen: boolean;
  onClose: () => void;
  managers: Manager[];
}

function EditSdrDialog({ sdr, isOpen, onClose, managers }: EditSdrDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(sdr?.name || "");
  const [email, setEmail] = useState(sdr?.email || "");
  const [managerEmail, setManagerEmail] = useState(sdr?.managerEmail || "");
  const [managerId, setManagerId] = useState(sdr?.managerId || "");
  const [gender, setGender] = useState(sdr?.gender || "neutral");

  useEffect(() => {
    if (sdr) {
      setName(sdr.name || "");
      setEmail(sdr.email || "");
      setManagerEmail(sdr.managerEmail || "");
      setManagerId(sdr.managerId || "");
      setGender(sdr.gender || "neutral");
    }
  }, [sdr]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Sdr>) => {
      const res = await apiRequest("PATCH", `/api/sdrs/${sdr!.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SDR Updated", description: "Changes saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!name || !email || !managerEmail) {
      toast({ title: "Missing Fields", description: "Name, email, and manager email are required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ name, email, managerEmail, managerId: managerId || null, gender });
  };

  if (!sdr) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit SDR: {sdr.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-sdr-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-sdr-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="managerEmail">Manager Email</Label>
            <Input id="managerEmail" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} data-testid="input-sdr-manager-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">Assigned Manager</Label>
            <Select value={managerId || "none"} onValueChange={(v) => setManagerId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-sdr-manager">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender (for coaching tone)</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger data-testid="select-sdr-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-sdr">
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  managers: Manager[];
}

function AddTeamMemberDialog({ isOpen, onClose, managers }: AddTeamMemberDialogProps) {
  const { toast } = useToast();
  const [memberType, setMemberType] = useState<"sdr" | "manager" | "ae">("sdr");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerId, setManagerId] = useState("");
  const [gender, setGender] = useState("neutral");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [specialty, setSpecialty] = useState("");

  const resetForm = () => {
    setMemberType("sdr");
    setId(""); setName(""); setEmail(""); setManagerEmail(""); setManagerId(""); setGender("neutral");
    setPhone(""); setRegion(""); setSpecialty("");
  };

  const createSdrMutation = useMutation({
    mutationFn: async (sdrData: any) => {
      const res = await apiRequest("POST", "/api/sdrs", sdrData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SDR Created", description: "New team member added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    }
  });

  const createManagerMutation = useMutation({
    mutationFn: async (managerData: any) => {
      const res = await apiRequest("POST", "/api/managers", managerData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Manager Created", description: "New manager added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    }
  });

  const createAeMutation = useMutation({
    mutationFn: async (aeData: any) => {
      const res = await apiRequest("POST", "/api/account-executives", aeData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Executive Created", description: "New AE added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
      resetForm();
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleCreate = () => {
    if (!name || !email) {
      toast({ title: "Missing Fields", description: "Name and email are required", variant: "destructive" });
      return;
    }

    if (memberType === "sdr") {
      if (!id || !managerEmail) {
        toast({ title: "Missing Fields", description: "ID and manager email are required for SDRs", variant: "destructive" });
        return;
      }
      createSdrMutation.mutate({ id, name, email, managerEmail, managerId: managerId || null, gender });
    } else if (memberType === "manager") {
      createManagerMutation.mutate({ name, email });
    } else if (memberType === "ae") {
      createAeMutation.mutate({ name, email, phone: phone || undefined, region: region || undefined, specialty: specialty || undefined });
    }
  };

  const isPending = createSdrMutation.isPending || createManagerMutation.isPending || createAeMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Member Type</Label>
            <Select value={memberType} onValueChange={(v) => setMemberType(v as "sdr" | "manager" | "ae")}>
              <SelectTrigger data-testid="select-member-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sdr">SDR (Sales Development Rep)</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="ae">Account Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {memberType === "sdr" && (
            <div className="space-y-2">
              <Label htmlFor="new-id">ID (unique identifier)</Label>
              <Input id="new-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g., JOHN_DOE" data-testid="input-new-member-id" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-new-member-name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-new-member-email" />
          </div>

          {memberType === "sdr" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-managerEmail">Manager Email</Label>
                <Input id="new-managerEmail" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} data-testid="input-new-member-manager-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-manager">Assigned Manager</Label>
                <Select value={managerId || "none"} onValueChange={(v) => setManagerId(v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="select-new-member-manager">
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-gender">Gender (for coaching tone)</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="select-new-member-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {memberType === "ae" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input id="new-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" data-testid="input-new-member-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-region">Region</Label>
                <Input id="new-region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g., West Coast" data-testid="input-new-member-region" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-specialty">Specialty</Label>
                <Input id="new-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g., Enterprise, SolidWorks" data-testid="input-new-member-specialty" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isPending} data-testid="button-create-member">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add {memberType === "sdr" ? "SDR" : memberType === "manager" ? "Manager" : "AE"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingSdr, setEditingSdr] = useState<Sdr | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAe, setEditingAe] = useState<AccountExecutive | null>(null);
  const [aeForm, setAeForm] = useState({ name: "", email: "", phone: "", region: "", specialty: "" });

  const { data: teamData, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/team"],
  });

  const { data: accountExecutives = [] } = useQuery<AccountExecutive[]>({
    queryKey: ["/api/account-executives"],
  });

  const populateSdrsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/populate-sdrs", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SDR Directory Updated",
        description: `Created ${data.managersCreated?.length || 0} managers and ${data.sdrsCreated?.length || 0} SDRs from audio files.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to populate SDRs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sdrId: string) => {
      const res = await apiRequest("DELETE", `/api/sdrs/${sdrId}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SDR Deleted", description: "Team member removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateAeMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; email?: string; phone?: string; region?: string; specialty?: string }) => {
      const res = await apiRequest("PATCH", `/api/account-executives/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Executive Updated", description: "Changes saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
      setEditingAe(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteAeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/account-executives/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account Executive Removed", description: "AE removed from team" });
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const openEditAeDialog = (ae: AccountExecutive) => {
    setEditingAe(ae);
    setAeForm({
      name: ae.name,
      email: ae.email,
      phone: ae.phone || "",
      region: ae.region || "",
      specialty: ae.specialty || ""
    });
  };

  const handleAeSave = () => {
    if (!aeForm.name || !aeForm.email) {
      toast({ title: "Missing Fields", description: "Name and email are required", variant: "destructive" });
      return;
    }
    if (editingAe) {
      updateAeMutation.mutate({ id: editingAe.id, ...aeForm });
    }
  };

  const allManagers = teamData?.teamByManager.map(t => t.manager) || [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderSdrCard = (sdr: Sdr) => (
    <div
      key={sdr.id}
      className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md hover:bg-muted/80 transition-colors"
      data-testid={`sdr-card-${sdr.id}`}
    >
      <Link href={`/team/${sdr.id}`} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getInitials(sdr.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium group-hover:text-primary transition-colors">{sdr.name}</p>
          {sdr.email && (
            <p className="text-xs text-muted-foreground truncate" data-testid={`text-sdr-email-${sdr.id}`}>{sdr.email}</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" asChild title="View Performance">
          <Link href={`/team/${sdr.id}`}>
            <TrendingUp className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setEditingSdr(sdr)} data-testid={`button-edit-sdr-${sdr.id}`} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        {sdr.email && (
          <Button variant="ghost" size="icon" asChild title="Send Email">
            <a href={`mailto:${sdr.email}`}>
              <Mail className="h-4 w-4" />
            </a>
          </Button>
        )}
        {user?.role === "admin" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${sdr.name}?`)) {
                deleteMutation.mutate(sdr.id);
              }
            }}
            data-testid={`button-delete-sdr-${sdr.id}`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Team Directory</h1>
          <p className="text-muted-foreground">
            Manage your sales development representatives
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === "admin" && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                data-testid="button-add-team-member"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => populateSdrsMutation.mutate()}
                disabled={populateSdrsMutation.isPending}
                data-testid="button-populate-sdrs"
              >
                {populateSdrsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FolderSync className="h-4 w-4 mr-2" />
                )}
                Sync from Drive
              </Button>
            </>
          )}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {teamData?.totalManagers || 0} Managers
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {teamData?.totalSdrs || 0} SDRs
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {accountExecutives.length} AEs
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teamData?.teamByManager.map(({ manager, sdrs }) => (
          <Card key={manager.id}>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(manager.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{manager.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Sales Manager
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{sdrs.length} SDRs</Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {manager.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Mail className="h-4 w-4" />
                      {manager.email}
                    </div>
                  )}
                  {sdrs.length > 0 ? (
                    <div className="space-y-3">
                      {sdrs.map(renderSdrCard)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No SDRs assigned to this manager
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {teamData?.unassignedSdrs && teamData.unassignedSdrs.length > 0 && (
          <Card>
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-muted">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">Unassigned SDRs</CardTitle>
                        <CardDescription>SDRs without a manager</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{teamData.unassignedSdrs.length} SDRs</Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {teamData.unassignedSdrs.map(renderSdrCard)}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}
      </div>

      {(accountExecutives.length > 0 || user?.role === "admin") && (
        <Card>
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">Account Executives</CardTitle>
                      <CardDescription>Available for lead handoffs</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{accountExecutives.length} AEs</Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  {accountExecutives.map((ae) => (
                    <div
                      key={ae.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                      data-testid={`ae-card-${ae.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(ae.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ae.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{ae.email}</span>
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {ae.region && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {ae.region}
                            </Badge>
                          )}
                          {ae.specialty && (
                            <Badge variant="secondary" className="text-xs">
                              {ae.specialty}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {ae.phone && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`tel:${ae.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`mailto:${ae.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                        {user?.role === "admin" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEditAeDialog(ae)} data-testid={`button-edit-ae-${ae.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (confirm(`Are you sure you want to remove ${ae.name}?`)) {
                                  deleteAeMutation.mutate(ae.id);
                                }
                              }}
                              data-testid={`button-delete-ae-${ae.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {(!teamData?.teamByManager || teamData.teamByManager.length === 0) && 
       (!teamData?.unassignedSdrs || teamData.unassignedSdrs.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Team Members Yet</h3>
            <p className="text-muted-foreground mb-4">
              Team members will appear here once they're added to the system.
            </p>
            {user?.role === "admin" && (
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-team-member">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Team Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <EditSdrDialog 
        sdr={editingSdr} 
        isOpen={!!editingSdr} 
        onClose={() => setEditingSdr(null)}
        managers={allManagers}
      />

      <AddTeamMemberDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        managers={allManagers}
      />

      <Dialog open={!!editingAe} onOpenChange={(open) => !open && setEditingAe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account Executive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ae-name">Name</Label>
                <Input 
                  id="ae-name" 
                  value={aeForm.name} 
                  onChange={(e) => setAeForm(prev => ({ ...prev, name: e.target.value }))} 
                  data-testid="input-ae-name" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ae-email">Email</Label>
                <Input 
                  id="ae-email" 
                  type="email" 
                  value={aeForm.email} 
                  onChange={(e) => setAeForm(prev => ({ ...prev, email: e.target.value }))} 
                  data-testid="input-ae-email" 
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ae-phone">Phone</Label>
                <Input 
                  id="ae-phone" 
                  value={aeForm.phone} 
                  onChange={(e) => setAeForm(prev => ({ ...prev, phone: e.target.value }))} 
                  placeholder="+1 (555) 123-4567"
                  data-testid="input-ae-phone" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ae-region">Region</Label>
                <Input 
                  id="ae-region" 
                  value={aeForm.region} 
                  onChange={(e) => setAeForm(prev => ({ ...prev, region: e.target.value }))} 
                  placeholder="e.g., West Coast"
                  data-testid="input-ae-region" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ae-specialty">Specialty</Label>
              <Input 
                id="ae-specialty" 
                value={aeForm.specialty} 
                onChange={(e) => setAeForm(prev => ({ ...prev, specialty: e.target.value }))} 
                placeholder="e.g., Enterprise, SolidWorks"
                data-testid="input-ae-specialty" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAe(null)}>Cancel</Button>
            <Button onClick={handleAeSave} disabled={updateAeMutation.isPending} data-testid="button-save-ae">
              {updateAeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
