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
  Plus
} from "lucide-react";
import type { Manager, Sdr } from "@shared/schema";

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

interface AddSdrDialogProps {
  isOpen: boolean;
  onClose: () => void;
  managers: Manager[];
}

function AddSdrDialog({ isOpen, onClose, managers }: AddSdrDialogProps) {
  const { toast } = useToast();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerId, setManagerId] = useState("");
  const [gender, setGender] = useState("neutral");

  const createMutation = useMutation({
    mutationFn: async (sdrData: any) => {
      const res = await apiRequest("POST", "/api/sdrs", sdrData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SDR Created", description: "New team member added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setId(""); setName(""); setEmail(""); setManagerEmail(""); setManagerId(""); setGender("neutral");
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleCreate = () => {
    if (!id || !name || !email || !managerEmail) {
      toast({ title: "Missing Fields", description: "ID, name, email, and manager email are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ id, name, email, managerEmail, managerId: managerId || null, gender });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New SDR</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-id">SDR ID (unique identifier)</Label>
            <Input id="new-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g., JOHN_DOE" data-testid="input-new-sdr-id" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-new-sdr-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-new-sdr-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-managerEmail">Manager Email</Label>
            <Input id="new-managerEmail" type="email" value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} data-testid="input-new-sdr-manager-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-manager">Assigned Manager</Label>
            <Select value={managerId || "none"} onValueChange={(v) => setManagerId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-new-sdr-manager">
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
              <SelectTrigger data-testid="select-new-sdr-gender">
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
          <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-sdr">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add SDR
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

  const { data: teamData, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/team"],
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
      className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
      data-testid={`sdr-card-${sdr.id}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getInitials(sdr.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{sdr.name}</p>
          {sdr.email && (
            <p className="text-xs text-muted-foreground" data-testid={`text-sdr-email-${sdr.id}`}>{sdr.email}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditingSdr(sdr)} data-testid={`button-edit-sdr-${sdr.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        {sdr.email && (
          <Button variant="ghost" size="icon" asChild>
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
                data-testid="button-add-sdr"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add SDR
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
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-sdr">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First SDR
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

      <AddSdrDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        managers={allManagers}
      />
    </div>
  );
}
