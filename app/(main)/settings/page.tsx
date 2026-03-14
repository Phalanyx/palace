import { CogIcon, SparklesIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/70">
          Account
        </p>
        <h2 className="font-[family-name:var(--font-baloo)] text-5xl leading-none text-foreground">
          Settings
        </h2>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Palace account preferences will live here once the rest of the account surface is wired up.
        </p>
      </section>

      <Card className="border-border/60 bg-card/90 shadow-lg">
        <CardHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CogIcon />
          </div>
          <CardTitle className="font-[family-name:var(--font-baloo)] text-3xl">
            Preferences are coming next
          </CardTitle>
          <CardDescription className="text-base leading-7">
            Theme switching already works from the user menu. More account controls can be added here without changing the shared shell again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <SparklesIcon className="text-primary" />
          This page is intentionally lightweight for now.
        </CardContent>
      </Card>
    </div>
  )
}
