import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function StaffLoginPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8 text-center">
        <Link href="/">
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            BarberShop
          </span>
        </Link>
      </div>
      <LoginForm role="staff" />
    </div>
  );
}
