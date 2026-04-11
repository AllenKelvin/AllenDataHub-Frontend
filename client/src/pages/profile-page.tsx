import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const BACKEND_URL = "https://allen-data-hub-backend.onrender.com";

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();
  const [amount, setAmount] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: apiAccessStatus, isLoading: apiStatusLoading } = useQuery({
    queryKey: ["/api/agent/api-access/status"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/status");
      if (!res.ok) throw new Error("Failed to load API status");
      return res.json() as Promise<{ status: string; hasKey?: boolean }>;
    },
    enabled: !!user && user.role === "agent" && !!user.isVerified,
  });

  const requestApiMutation = useMutation({
    mutationFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/request", { method: "POST", body: JSON.stringify({}) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { message?: string }).message || "Request failed");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent/api-access/status"] });
      toast({ title: "Request sent", description: "An admin will review and issue your API key." });
    },
    onError: (e: Error) => toast({ title: "Could not request API access", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const userEmail = user.email || user.username || '';

  async function updateEmail() {
    if (!email || !email.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    setIsSavingEmail(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
      const resp = await fetchWithAuth('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        throw new Error('Failed to update email');
      }
      const updated = await resp.json();
      qc.setQueryData(['api/user'], updated);
      toast({ title: 'Success', description: 'Email updated successfully' });
      setEmail('');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to update email', variant: 'destructive' });
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function fundWallet() {
    if (!user) return;
    if (amount <= 0) return toast({ title: 'Invalid amount', variant: 'destructive' });
    setIsPaymentLoading(true);
    try {
      const { fetchWithAuth } = await import('@/lib/fetchWithAuth');
      const resp = await fetchWithAuth('/api/paystack/initialize', {
        method: 'POST',
        body: JSON.stringify({ amount: Math.round(amount * 100), email: userEmail, metadata: { type: 'wallet', agentId: user.id } }),
      });
      const data = await resp.json();
      if (data && (data.data?.authorization_url || data.authorization_url)) {
        const url = data.data?.authorization_url || data.authorization_url;
        toast({ title: 'Redirecting', description: 'Redirecting to Paystack...', variant: 'default' });
        // small delay to allow toast to show briefly
        setTimeout(() => { window.location.href = url; }, 200);
      } else {
        setIsPaymentLoading(false);
        toast({ title: 'Payment init failed', description: 'Could not initialize Paystack', variant: 'destructive' });
      }
    } catch (e) {
      setIsPaymentLoading(false);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to initialize payment', variant: 'destructive' });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-border/50">
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="text-sm text-muted-foreground mt-2">Username: {user.username}</p>
        <p className="text-sm text-muted-foreground">Email: {user.email || '—'}</p>
        <p className="text-sm text-muted-foreground">Role: {user.role}</p>
        
        {/* Email Update Section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Update Email</h3>
          <p className="text-xs text-muted-foreground mb-3">A valid email is required for Paystack payments</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={updateEmail} disabled={isSavingEmail || !email}>
              {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
        
        {user.role === "agent" && user.isVerified && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <div>
              <h3 className="font-semibold">Partner API</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Request access to integrate your own site or app. An admin sets your API prices and issues a secret key.
                Purchases use your wallet balance.
              </p>
              {apiStatusLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mt-3 text-muted-foreground" />
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {apiAccessStatus?.status === "none" && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={requestApiMutation.isPending}
                      onClick={() => requestApiMutation.mutate()}
                    >
                      {requestApiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Request API access
                    </Button>
                  )}
                  {apiAccessStatus?.status === "pending" && (
                    <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      API access pending admin approval
                    </span>
                  )}
                  {apiAccessStatus?.status === "active" && (
                    <span className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                      API key active — use the key provided by your admin with{" "}
                      <code className="text-xs">X-API-Key</code> on the public API.
                    </span>
                  )}
                  {apiAccessStatus?.status === "revoked" && (
                    <>
                      <span className="text-sm text-destructive">API access revoked.</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={requestApiMutation.isPending}
                        onClick={() => requestApiMutation.mutate()}
                      >
                        Request again
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {user.role === "agent" && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold">Agent Wallet</h3>
            <p className="text-sm text-muted-foreground mb-2">Balance: GHS {(user.balance || 0)}</p>
            <div className="flex gap-2 items-center">
              <Button onClick={() => setLocation("/fund-wallet")}>Fund Account</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
