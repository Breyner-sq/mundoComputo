import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Verify2FA() {
  const { session } = useAuth();
  const email = session?.user?.email || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.functions.invoke('verify-2fa', { body: { email, code } });
      toast({ title: 'Verificado', description: 'Código correcto. Redirigiendo...' });
      // Reload role/state by fetching session (AuthProvider will run fetchUserRole again)
      await supabase.auth.getSession();
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Código inválido', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await supabase.functions.invoke('send-2fa', { body: { email } });
      toast({ title: 'Enviado', description: 'Se ha reenviado el código.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'No se pudo reenviar el código', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verificación en dos pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Hemos enviado un código al correo <strong>{email}</strong>. Ingresa el código para continuar.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Código</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Verificando...' : 'Verificar'}</Button>
              <Button type="button" variant="outline" onClick={resend}>Reenviar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
