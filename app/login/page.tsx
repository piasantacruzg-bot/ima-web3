import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl tracking-tight text-ink">Creator Campaign OS</p>
          <p className="mt-1 text-sm text-ink-soft">Sign in to your agency workspace.</p>
        </div>
        <div className="card p-6">
          <LoginForm next={next ?? "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-ink-soft">
          Accounts are provisioned by your workspace admin.
        </p>
      </div>
    </main>
  );
}
