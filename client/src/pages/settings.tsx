import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Briefcase, Check, KeyRound, Loader2, Mail, Phone, MapPin, Shield, Trash2, User, UserCog, Users, Plus, Edit2, Menu, GripVertical, ArrowUp, ArrowDown, Link2, RefreshCw, Cloud, CloudOff, ExternalLink } from "lucide-react";
import type { User as UserType, AccountExecutive, NavigationSetting } from "@shared/schema";

type UserWithoutPassword = Omit<UserType, "password">;

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleDisplay(role: string) {
  const roleMap: Record<string, string> = {
    admin: "Administrator",
    manager: "Sales Manager",
    sdr: "SDR",
    account_specialist: "Account Specialist",
    account_executive: "Account Executive"
  };
  return roleMap[role] || role;
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithoutPassword | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [aeDialogOpen, setAeDialogOpen] = useState(false);
  const [editingAe, setEditingAe] = useState<AccountExecutive | null>(null);
  const [aeDeleteDialogOpen, setAeDeleteDialogOpen] = useState(false);
  const [aeToDelete, setAeToDelete] = useState<AccountExecutive | null>(null);
  const [aeForm, setAeForm] = useState({ name: "", email: "", phone: "", region: "", specialty: "" });

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canManageUsers = isAdmin || isManager;

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
    enabled: canManageUsers
  });

  const { data: accountExecutives = [], isLoading: aesLoading } = useQuery<AccountExecutive[]>({
    queryKey: ["/api/account-executives"],
    enabled: canManageUsers
  });

  const { data: navigationSettings = [], isLoading: navSettingsLoading } = useQuery<NavigationSetting[]>({
    queryKey: ["/api/navigation-settings"],
    enabled: isAdmin
  });

  const { data: salesforceStatus, isLoading: sfStatusLoading, refetch: refetchSfStatus } = useQuery<{
    connected: boolean;
    instanceUrl?: string;
    lastSyncAt?: string;
  }>({
    queryKey: ["/api/salesforce/status"],
    enabled: isAdmin
  });

  const { data: syncLogs = [] } = useQuery<Array<{
    id: string;
    operation: string;
    direction: string;
    recordCount: number;
    status: string;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
  }>>({
    queryKey: ["/api/salesforce/sync-logs"],
    enabled: isAdmin && salesforceStatus?.connected
  });

  const updateNavSettingMutation = useMutation({
    mutationFn: async ({ id, isEnabled, sortOrder }: { id: string; isEnabled?: boolean; sortOrder?: number }) => {
      const res = await apiRequest("PATCH", `/api/navigation-settings/${id}`, { isEnabled, sortOrder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/navigation-settings"] });
      toast({ title: "Navigation updated", description: "Menu settings have been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  });

  const connectSalesforceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/salesforce/connect");
      return res.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    }
  });

  const disconnectSalesforceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/salesforce/disconnect");
      return res.json();
    },
    onSuccess: () => {
      refetchSfStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/salesforce/sync-logs"] });
      toast({ title: "Disconnected", description: "Salesforce has been disconnected" });
    },
    onError: (error: Error) => {
      toast({ title: "Disconnect failed", description: error.message, variant: "destructive" });
    }
  });

  const importLeadsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/salesforce/import", { limit: 100 });
      return res.json();
    },
    onSuccess: (data: { imported: number; updated: number; errors: string[] }) => {
      refetchSfStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/salesforce/sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} new leads, updated ${data.updated} existing leads${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ""}`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your profile has been updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Password updated", description: "You will be logged out for security. Please log in with your new password." });
      await logout();
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({ title: "Password update failed", description: error.message, variant: "destructive" });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      setUpdatingRoleUserId(userId);
      const res = await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      setUpdatingRoleUserId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated", description: "User role has been updated" });
    },
    onError: (error: Error) => {
      setUpdatingRoleUserId(null);
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({ title: "User deleted", description: "The user has been removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  });

  const createAeMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string; region?: string; specialty?: string }) => {
      const res = await apiRequest("POST", "/api/account-executives", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
      setAeDialogOpen(false);
      setAeForm({ name: "", email: "", phone: "", region: "", specialty: "" });
      toast({ title: "Account Executive added", description: "The AE has been added to the team" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add AE", description: error.message, variant: "destructive" });
    }
  });

  const updateAeMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; email?: string; phone?: string; region?: string; specialty?: string }) => {
      const res = await apiRequest("PATCH", `/api/account-executives/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
      setAeDialogOpen(false);
      setEditingAe(null);
      setAeForm({ name: "", email: "", phone: "", region: "", specialty: "" });
      toast({ title: "Account Executive updated", description: "Changes have been saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    }
  });

  const deleteAeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/account-executives/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-executives"] });
      setAeDeleteDialogOpen(false);
      setAeToDelete(null);
      toast({ title: "Account Executive removed", description: "The AE has been removed from the team" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  });

  const handleAeSubmit = () => {
    if (!aeForm.name || !aeForm.email) {
      toast({ title: "Missing required fields", description: "Name and email are required", variant: "destructive" });
      return;
    }
    if (editingAe) {
      updateAeMutation.mutate({ id: editingAe.id, ...aeForm });
    } else {
      createAeMutation.mutate(aeForm);
    }
  };

  const openEditAeDialog = (ae: AccountExecutive) => {
    setEditingAe(ae);
    setAeForm({
      name: ae.name,
      email: ae.email,
      phone: ae.phone || "",
      region: ae.region || "",
      specialty: ae.specialty || ""
    });
    setAeDialogOpen(true);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { name?: string; email?: string } = {};
    if (name !== user?.name) updates.name = name;
    if (email !== user?.email) updates.email = email;
    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : canManageUsers ? 'grid-cols-3' : 'grid-cols-2'}`} data-testid="tabs-settings">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <KeyRound className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="navigation" data-testid="tab-navigation">
              <Menu className="h-4 w-4 mr-2" />
              Navigation
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="integrations" data-testid="tab-integrations">
              <Link2 className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>View and update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-medium" data-testid="text-user-name">{user.name}</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid="text-user-email">{user.email}</span>
                  </div>
                  <Badge variant="secondary" className="mt-1" data-testid="badge-user-role">
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplay(user.role)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending || (name === user.name && email === user.email)}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Additional account information</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="font-mono text-xs" data-testid="text-user-id">{user.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Account Created</dt>
                  <dd data-testid="text-created-date">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Login</dt>
                  <dd data-testid="text-last-login">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "N/A"}
                  </dd>
                </div>
                {user.sdrId && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">SDR ID</dt>
                    <dd className="font-mono text-xs">{user.sdrId}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-testid="input-current-password"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Passwords do not match
                  </p>
                )}
                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  data-testid="button-change-password"
                >
                  {updatePasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  {isAdmin ? "Manage all users and their roles" : "View team members"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allUsers.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between gap-4 p-4 rounded-md border"
                        data-testid={`user-row-${u.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-muted">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {updatingRoleUserId === u.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isAdmin ? (
                            <Select
                              value={u.role}
                              onValueChange={(role) => updateRoleMutation.mutate({ userId: u.id, role })}
                              disabled={u.id === user.id || updatingRoleUserId === u.id}
                            >
                              <SelectTrigger className="w-40" data-testid={`select-role-${u.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrator</SelectItem>
                                <SelectItem value="manager">Sales Manager</SelectItem>
                                <SelectItem value="sdr">SDR</SelectItem>
                                <SelectItem value="account_specialist">Account Specialist</SelectItem>
                                <SelectItem value="account_executive">Account Executive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">
                              {getRoleDisplay(u.role)}
                            </Badge>
                          )}
                          {u.id === user.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                          {isAdmin && u.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`button-delete-${u.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {allUsers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No users found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="navigation" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Menu className="h-5 w-5" />
                  Navigation Settings
                </CardTitle>
                <CardDescription>
                  Toggle menu items on/off and change their display order
                </CardDescription>
              </CardHeader>
              <CardContent>
                {navSettingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const sortedSettings = [...navigationSettings].sort((a, b) => a.sortOrder - b.sortOrder);
                      return sortedSettings.map((setting, index) => (
                        <div
                          key={setting.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-md border"
                          data-testid={`nav-setting-${setting.navKey}`}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{setting.label}</p>
                              <p className="text-sm text-muted-foreground">{setting.navKey}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={index === 0 || updateNavSettingMutation.isPending}
                                onClick={() => {
                                  const prevItem = sortedSettings[index - 1];
                                  if (prevItem) {
                                    const prevOrder = prevItem.sortOrder;
                                    const currentOrder = setting.sortOrder;
                                    updateNavSettingMutation.mutate({ id: setting.id, sortOrder: prevOrder });
                                    updateNavSettingMutation.mutate({ id: prevItem.id, sortOrder: currentOrder });
                                  }
                                }}
                                data-testid={`button-move-up-${setting.navKey}`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={index === sortedSettings.length - 1 || updateNavSettingMutation.isPending}
                                onClick={() => {
                                  const nextItem = sortedSettings[index + 1];
                                  if (nextItem) {
                                    const nextOrder = nextItem.sortOrder;
                                    const currentOrder = setting.sortOrder;
                                    updateNavSettingMutation.mutate({ id: setting.id, sortOrder: nextOrder });
                                    updateNavSettingMutation.mutate({ id: nextItem.id, sortOrder: currentOrder });
                                  }
                                }}
                                data-testid={`button-move-down-${setting.navKey}`}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`nav-toggle-${setting.id}`} className="text-sm">
                              {setting.isEnabled ? "Visible" : "Hidden"}
                            </Label>
                            <Switch
                              id={`nav-toggle-${setting.id}`}
                              checked={setting.isEnabled}
                              onCheckedChange={(checked) => {
                                updateNavSettingMutation.mutate({ id: setting.id, isEnabled: checked });
                              }}
                              disabled={updateNavSettingMutation.isPending}
                              data-testid={`switch-toggle-${setting.navKey}`}
                            />
                          </div>
                          </div>
                        </div>
                      ));
                    })()}
                    {navigationSettings.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No navigation settings found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Salesforce Integration
                </CardTitle>
                <CardDescription>
                  Connect your Salesforce CRM to import leads and sync handover data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {sfStatusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : salesforceStatus?.connected ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Connected to Salesforce</p>
                          {salesforceStatus.instanceUrl && (
                            <p className="text-sm text-green-600 dark:text-green-400">{salesforceStatus.instanceUrl}</p>
                          )}
                          {salesforceStatus.lastSyncAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last sync: {new Date(salesforceStatus.lastSyncAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectSalesforceMutation.mutate()}
                        disabled={disconnectSalesforceMutation.isPending}
                      >
                        {disconnectSalesforceMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CloudOff className="h-4 w-4 mr-2" />
                        )}
                        Disconnect
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Import Leads</h4>
                      <p className="text-sm text-muted-foreground">
                        Pull leads from Salesforce into Lead Intel. Existing leads will be updated with the latest data.
                      </p>
                      <Button
                        onClick={() => importLeadsMutation.mutate()}
                        disabled={importLeadsMutation.isPending}
                      >
                        {importLeadsMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Import Leads from Salesforce
                          </>
                        )}
                      </Button>
                    </div>

                    {syncLogs.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h4 className="font-medium">Recent Sync Activity</h4>
                          <div className="space-y-2">
                            {syncLogs.slice(0, 5).map((log) => (
                              <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                  <p className="text-sm font-medium">
                                    {log.operation === "import_leads" ? "Lead Import" : log.operation}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(log.startedAt).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                                    {log.status}
                                  </Badge>
                                  {log.recordCount > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      {log.recordCount} records
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <CloudOff className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Not Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Connect your Salesforce account to sync leads
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => connectSalesforceMutation.mutate()}
                      disabled={connectSalesforceMutation.isPending}
                    >
                      {connectSalesforceMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Cloud className="h-4 w-4 mr-2" />
                          Connect Salesforce
                        </>
                      )}
                    </Button>

                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium">Setup Required</p>
                          <p className="mt-1">
                            Before connecting, ensure the Salesforce Connected App is configured with the correct OAuth credentials 
                            (SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET environment variables).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={aeDialogOpen} onOpenChange={(open) => {
        setAeDialogOpen(open);
        if (!open) {
          setEditingAe(null);
          setAeForm({ name: "", email: "", phone: "", region: "", specialty: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAe ? "Edit Account Executive" : "Add Account Executive"}</DialogTitle>
            <DialogDescription>
              {editingAe ? "Update the account executive's information" : "Add a new account executive to your team for lead handoffs"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ae-name">Name *</Label>
                <Input
                  id="ae-name"
                  value={aeForm.name}
                  onChange={(e) => setAeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  data-testid="input-ae-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ae-email">Email *</Label>
                <Input
                  id="ae-email"
                  type="email"
                  value={aeForm.email}
                  onChange={(e) => setAeForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ae@company.com"
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
                  placeholder="e.g., West Coast, EMEA"
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
                placeholder="e.g., Enterprise, SMB, SolidWorks"
                data-testid="input-ae-specialty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAeSubmit}
              disabled={createAeMutation.isPending || updateAeMutation.isPending}
              data-testid="button-save-ae"
            >
              {(createAeMutation.isPending || updateAeMutation.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editingAe ? "Save Changes" : "Add Account Executive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aeDeleteDialogOpen} onOpenChange={setAeDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Account Executive</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {aeToDelete?.name} from the team? They will no longer receive lead handoffs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAeDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => aeToDelete && deleteAeMutation.mutate(aeToDelete.id)}
              disabled={deleteAeMutation.isPending}
              data-testid="button-confirm-delete-ae"
            >
              {deleteAeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove AE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
