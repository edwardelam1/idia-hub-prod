import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSynapseCredits } from '@/contexts/SynapseCreditsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatIdiaUsd } from '@/lib/utils';

interface WithdrawCryptoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WithdrawCryptoModal = ({ open, onOpenChange }: WithdrawCryptoModalProps) => {
  const { balanceData, refreshBalance } = useSynapseCredits();
  const currentBalance = balanceData?.available_credits ?? 0;

  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMsg, setErrorMsg] = useState('');

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= 1 && parsedAmount <= currentBalance;
  const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  const networkFee = 0.50; // estimated USDC gas fee
  const netAmount = Math.max(parsedAmount - networkFee, 0);
  const canSubmit = isValidAmount && isValidWallet && step === 'form';

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('form');
      setAmount('');
      setWalletAddress('');
      setErrorMsg('');
    }, 200);
  };

  const handleWithdraw = async () => {
    if (!canSubmit) return;
    setStep('processing');

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('withdraw-to-crypto', {
        body: {
          user_id: userId,
          amount: parsedAmount,
          destination_address: walletAddress,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep('success');
      toast.success('Withdrawal initiated', {
        description: `${formatIdiaUsd(parsedAmount)} IDIA-USD → USDC sent to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      });
      await refreshBalance();
      setTimeout(handleClose, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal failed');
      setStep('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw to Crypto Wallet
          </DialogTitle>
          <DialogDescription>
            Convert IDIA-USD to USDC and send to your Web3 wallet via Circle.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-5 pt-2">
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Available: </span>
              <span className="font-bold text-foreground font-mono">{formatIdiaUsd(currentBalance)}</span>
              <span className="text-muted-foreground"> IDIA-USD</span>
            </div>

            <div className="space-y-2">
              <Label>Withdrawal Amount (IDIA-USD)</Label>
              <div className="flex items-center gap-0">
                <span className="flex items-center justify-center h-10 px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm font-medium text-muted-foreground">$</span>
                <Input
                  className="rounded-none rounded-r-md font-mono"
                  placeholder="100.0000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                />
              </div>
              {amount && !isValidAmount && (
                <p className="text-xs text-destructive">
                  {parsedAmount < 1 ? 'Minimum withdrawal is $1.0000' : 'Insufficient balance'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Destination Wallet Address</Label>
              <Input
                className="font-mono text-sm"
                placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d89A34"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value.trim())}
              />
              {walletAddress && !isValidWallet && (
                <p className="text-xs text-destructive">Must be a valid 0x Ethereum address (42 characters)</p>
              )}
            </div>

            {isValidAmount && isValidWallet && (
              <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono text-foreground">{formatIdiaUsd(parsedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee (est.)</span>
                  <span className="font-mono text-muted-foreground">-{formatIdiaUsd(networkFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium text-foreground">You Receive (USDC)</span>
                  <span className="font-mono font-bold text-foreground">{formatIdiaUsd(netAmount)}</span>
                </div>
              </div>
            )}

            <Button className="w-full gap-2" size="lg" onClick={handleWithdraw} disabled={!canSubmit}>
              Withdraw via Circle <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-foreground font-semibold">Processing withdrawal...</p>
            <p className="text-muted-foreground text-sm">Initiating Circle USDC transfer</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <p className="text-foreground font-bold text-lg">Withdrawal Initiated!</p>
            <p className="text-muted-foreground text-sm text-center">
              {formatIdiaUsd(parsedAmount)} USDC is being transferred to your wallet. Check your wallet for confirmation.
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 py-4">
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => setStep('form')}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawCryptoModal;
