import logo from "@/assets/logo.png";

type Props = { size?: number; withText?: boolean; className?: string };

export function Logo({ size = 44, withText = true, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logo}
        alt="Gold Empire Investment"
        width={size}
        height={size}
        className="rounded-md"
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-xl tracking-wide text-gradient-gold">Gold Empire</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Investment</div>
        </div>
      )}
    </div>
  );
}
