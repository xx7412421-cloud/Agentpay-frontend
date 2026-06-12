import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = { title: "Settings — AgentPay" };

export default function SettingsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col gap-8 p-8 focus:outline-none"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Appearance</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a colour scheme. System follows your OS preference.
        </p>
        <ThemeToggle />
      </section>
    </main>
  );
}
