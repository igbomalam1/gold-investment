const TEAM = [
  { name: "Adrien Rousseau", role: "CEO & Co-founder", bio: "Ex-Goldman Sachs commodities desk, 14 yrs.", emoji: "🇫🇷" },
  { name: "Hannah Vogel", role: "Chief Investment Officer", bio: "Former BlackRock multi-asset PM.", emoji: "🇩🇪" },
  { name: "Kenji Watanabe", role: "Head of Crypto Trading", bio: "Built Tokyo's largest OTC desk.", emoji: "🇯🇵" },
  { name: "Sade Adebayo", role: "Head of Risk", bio: "Quant lead, 10+ yrs across HSBC & Citadel.", emoji: "🇳🇬" },
  { name: "Marco Bianchi", role: "Chief Technology Officer", bio: "Architect at Coinbase Custody.", emoji: "🇮🇹" },
  { name: "Eleanor Hayes", role: "Head of Compliance", bio: "Former FCA senior officer, London.", emoji: "🇬🇧" },
];

export function TeamSection() {
  return (
    <section id="team" className="relative py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-emerald opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Leadership</p>
          <h2 className="mt-3 font-display text-4xl lg:text-5xl">
            The desk behind <span className="text-gradient-gold">your gains</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-gold"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-gold text-3xl shadow-gold">
                  {m.emoji}
                </div>
                <div>
                  <h3 className="font-display text-xl">{m.name}</h3>
                  <div className="text-xs uppercase tracking-wider text-primary">{m.role}</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{m.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
