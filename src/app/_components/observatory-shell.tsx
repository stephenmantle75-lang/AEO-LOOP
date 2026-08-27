import Link from "next/link";

type ObservatoryShellProps = {
  active?: "overview" | "topics" | "runs" | "findings" | "experiments" | "integrations" | "architecture";
  findingCount?: number;
  children: React.ReactNode;
};

const items = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "topics", label: "Topics", href: "/topics" },
  { key: "runs", label: "Runs", href: "/runs" },
] as const;

const actionItems = [
  { key: "findings", label: "Findings", href: "/findings" },
  { key: "experiments", label: "Experiments", href: "/experiments" },
] as const;

const systemItems = [
  { key: "integrations", label: "Integrations", href: "/integrations" },
  { key: "architecture", label: "Architecture", href: "/architecture" },
] as const;

export function ObservatoryShell({ active = "overview", findingCount = 0, children }: ObservatoryShellProps) {
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="AEO Loop overview"><span className="brand-mark">A</span><span>AEO LOOP</span></Link>
      <nav aria-label="Observatory navigation">
        <div className="nav-label">Observe</div>
        {items.map((item) => <Link className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}><span>{item.label}</span>{item.key === "overview" && <span className="nav-count">Live</span>}{item.key === "topics" && <span className="nav-count">1</span>}</Link>)}
        <div className="nav-label">Act</div>
        {actionItems.map((item) => <Link className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}><span>{item.label}</span>{item.key === "findings" && <span className="nav-count">{findingCount}</span>}</Link>)}
        <div className="nav-label">System</div>
        {systemItems.map((item) => <Link className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}><span>{item.label}</span></Link>)}
      </nav>
    </aside>
    <main className="main">{children}</main>
  </div>;
}

export function PageHeader({ eyebrow, title, description, connected = true, statusTone, statusText, children }: { eyebrow: string; title: string; description: string; connected?: boolean; statusTone?: "connected" | "disconnected" | "neutral"; statusText?: string; children?: React.ReactNode }) {
  const tone = statusTone ?? (connected ? "connected" : "disconnected");
  const label = statusText ?? (connected ? "● Database connected" : "○ Setup required");
  return <div className="topbar page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="subhead">{description}</p></div>
    <div className="page-actions"><span className={`status-pill ${tone}`}>{label}</span>{children}</div>
  </div>;
}

export function ConnectionNotice({ connected }: { connected: boolean }) {
  return connected ? null : <div className="notice" role="status">The dashboard is awaiting server-only Supabase variables. No sample evidence is being presented.</div>;
}
