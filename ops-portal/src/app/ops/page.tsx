import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

// Portal root (/ops): authenticated operators go to /ops/launch (which mints
// the Caddy JWT and redirects to the proxied app at `/`). Everyone else goes
// to /ops/login.
export default async function PortalRootPage() {
  const session = await auth();
  if (session?.user != null) {
    redirect('/ops/launch');
  }
  redirect('/ops/login');
}
