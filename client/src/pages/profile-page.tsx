import { useState } from "react";
import { useUser } from "@/hooks/use-auth";
import { useAgentGenerateApiKey } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ProfileView from "@/components/profile/ProfileView";

const BACKEND_URL = "https://allen-data-hub-backend.onrender.com";

export default function ProfilePage() {
  const { data: user, isLoading } = useUser();
  const [amount, setAmount] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const generateKeyMutation = useAgentGenerateApiKey();

  const { data: apiAccessStatus, isLoading: apiStatusLoading, error: apiStatusError } = useQuery({
    queryKey: ["/api/agent/api-access/status"],
    queryFn: async () => {
      const { fetchWithAuth } = await import("@/lib/fetchWithAuth");
      const res = await fetchWithAuth("/api/agent/api-access/status");
      if (res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to load API status");
      return res.json() as Promise<{ status: string; hasKey?: boolean }>;
    },
    enabled: !!user && user.role === "agent",
    retry: false,
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
  const userEmail = user.email || '';

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
    if (!userEmail || !userEmail.includes('@')) {
      return toast({ title: 'Email required', description: 'Please update your profile with a valid email address before funding your wallet.', variant: 'destructive' });
    }
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
        const message = data?.message || 'Could not initialize Paystack';
        toast({ title: 'Payment init failed', description: message, variant: 'destructive' });
      }
    } catch (e) {
      setIsPaymentLoading(false);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to initialize payment', variant: 'destructive' });
    }
  }

  return (
    <ProfileView user={user} />
  );
                className="flex-1"
                onClick={() => {
                  if (generatedKey) {
                    navigator.clipboard.writeText(generatedKey);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }
                }}
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to clipboard
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGeneratedKey(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}