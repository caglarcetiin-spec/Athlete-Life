import { Activity, ArrowLeft, ChartNoAxesCombined, ChevronRight, Grid2X2, HeartPulse, House } from "lucide-react";

// Each route belongs to one section. Old URLs remain valid.
const sections = [
  { route: "today", label: "Bugün", icon: House, pages: [["today", "Bugün"]] },
  { route: "workout", label: "Antrenman", icon: Activity, pages: [["workout", "Seanslarım"], ["program", "Planım"], ["week", "Haftam"]] },
  { route: "health", label: "Sağlık", icon: HeartPulse, pages: [["health", "Sağlık kayıtları"], ["nutrition", "Beslenme ve su"]] },
  { route: "status", label: "Gelişim", icon: ChartNoAxesCombined, pages: [["status", "Durumum"], ["reports", "Raporlar ve 3B"], ["goals", "Hedeflerim"]] },
  { route: "tools", label: "Araçlar", icon: Grid2X2, pages: [["tools", "Araçlar"], ["chat", "AI ile sohbet et"], ["capability", "Capability Lab"], ["events", "Sürpriz Plan"], ["backups", "Yedekler ve arşiv"], ["science", "Bilim ve sınırlar"], ["system", "Sistem Durumu"], ["guide", "Yol haritam"]] },
];
export function PrimaryNavigation({ route, mobile = false }: { route: string; mobile?: boolean }) {
  return <nav className={mobile ? "mobile-primary" : "primary-navigation"} aria-label={mobile ? "Mobil ana gezinme" : "Ana gezinme"}>
    {sections.map(section => {
      const Icon = section.icon;
      return <a key={section.route} href={"#" + section.route} aria-current={section.pages.some(([key]) => key === route) ? "location" : undefined}>
        <Icon size={21} /><span>{section.label}</span>{!mobile && <ChevronRight size={16} />}
      </a>;
    })}
  </nav>;
}
export function SectionNavigation({ route }: { route: string }) {
  const section = sections.find(item => item.pages.some(([key]) => key === route));
  if (!section || section.pages.length === 1 || route === "tools") return null;
  if (section.route === "tools") return <nav className="section-path" aria-label="Bölüm yolu">
    <a href="#tools"><ArrowLeft size={16} />Araçlar</a><ChevronRight size={14}/><span aria-current="page">{section.pages.find(([key])=>key === route)?.[1]}</span>
  </nav>;
  return <nav className="section-navigation" aria-label={section.label + " bölümleri"}>
    {section.pages.map(([key, label])=><a key={key} href={"#"+key} aria-current={route === key ? "page" : undefined}>{label}</a>)}
  </nav>;
}
