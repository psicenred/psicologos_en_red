import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Registro Exitoso',
};

export default function RegistroExitosoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="max-w-lg text-center">
        <CardContent className="space-y-4 p-8">
          <div className="text-6xl">📧</div>
          <h1 className="text-2xl font-bold">¡Registro casi completo!</h1>
          <p className="text-muted-foreground">
            Hemos enviado un correo de verificación a tu dirección de email.
          </p>
          <div className="rounded-xl bg-primary/10 p-4 text-sm">
            <strong>Revisa tu bandeja de entrada</strong> y haz clic en el enlace para
            activar tu cuenta.
          </div>
          <ol className="list-decimal space-y-2 pl-6 text-left text-sm text-muted-foreground">
            <li>Abre tu correo electrónico</li>
            <li>Busca el correo de Psicólogos en Red</li>
            <li>Haz clic en &quot;Verificar mi cuenta&quot;</li>
            <li>¡Listo! Ya podrás iniciar sesión</li>
          </ol>
          <Button asChild className="rounded-full">
            <Link href="/login">Ir al Login</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            ¿No encuentras el correo? Revisa spam o correo no deseado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
