import Link from "next/link"
import { BookMarkedIcon, CastleIcon, ScrollTextIcon, SparklesIcon } from "lucide-react"

const footerSections = [
  {
    title: "Product",
    links: [
      { label: "Landing", href: "/" },
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
  {
    title: "Study flow",
    links: [
      { label: "Generate palaces", href: "#highlights" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Recall loops", href: "#highlights" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-primary/10 bg-[linear-gradient(180deg,_rgba(255,255,255,0.75)_0%,_rgba(238,242,255,0.95)_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_repeat(3,0.7fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[1.5rem] border border-primary/15 bg-white/85 text-primary shadow-lg shadow-primary/10">
                <CastleIcon className="size-5" />
              </div>
              <div>
                <p className="font-[family-name:var(--font-baloo)] text-3xl leading-none text-foreground">
                  Palace
                </p>
                <p className="text-sm text-muted-foreground">
                  Turn flat notes into vivid memory worlds.
                </p>
              </div>
            </div>

            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Palace blends AI-generated scenes, structured recall, and playful navigation so study material stays attached to something your brain can revisit.
            </p>

            <div className="flex flex-wrap gap-2">
              <Pill icon={SparklesIcon} label="AI generation" />
              <Pill icon={BookMarkedIcon} label="Active recall" />
              <Pill icon={ScrollTextIcon} label="Source-driven palaces" />
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-primary/70">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("/") ? (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-primary/10 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Palace. Built for richer studying.</p>
          <div className="flex items-center gap-4">
            <span>Playful by design.</span>
            <span>Focused on recall.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Pill({ icon: Icon, label }: { icon: typeof SparklesIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm shadow-primary/5">
      <Icon className="size-3.5 text-primary" />
      {label}
    </span>
  )
}
