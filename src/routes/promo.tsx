import { createFileRoute } from "@tanstack/react-router";
import {
  MessageCircle,
  Check,
  Gift,
  Flame,
  Bell,
  TrendingUp,
  ChevronRight,
  Zap,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: "GPEY TELECOM SERVICES — Early Access Community" },
      {
        name: "description",
        content:
          "Join GPEY TELECOM SERVICES WhatsApp community for exclusive launch offers, airtime & data discounts, and early user benefits.",
      },
      { property: "og:title", content: "GPEY TELECOM SERVICES — Early Access Community" },
      {
        property: "og:description",
        content:
          "Get early access to airtime, data, CAC registration, and exclusive launch bonuses on GPEY Telecom.",
      },
    ],
  }),
  component: PromoPage,
});

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/Lcve8KrVipQBoW6CiReDY4?mode=gi_t";

const bodyTextStyle = {
  fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "16px",
  lineHeight: "145%",
};

const headingStyle = {
  fontFamily: "'SF Compact', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 556,
  letterSpacing: "-0.04em",
  lineHeight: "120%",
};

function PromoPage() {
  const services = [
    "Airtime & Data",
    "Airtime 2 Cash",
    "Bulk SMS",
    "Bill Payment",
    "CAC Registration",
    "Gift Cards",
    "NIN & BVN Services",
    "OTP / Virtual Numbers",
    "Static Account Numbers",
    "SMM / Boost Social",
    "NECO & WAEC Recharge Pins",
    "Recharge Card Printing Logs",
  ];

  const benefits = [
    {
      icon: <Gift className="w-5 h-5 text-[#158A5E]" />,
      title: "launch bonuses 🎁",
    },
    {
      icon: <Flame className="w-5 h-5 text-[#158A5E]" />,
      title: "exclusive offers 🔥",
    },
    {
      icon: <Bell className="w-5 h-5 text-[#158A5E]" />,
      title: "instant updates 📢",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-[#158A5E]" />,
      title: "early access to special deals 💸",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white text-[#158A5E] flex flex-col justify-between selection:bg-[#158A5E]/10 selection:text-[#158A5E]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, #EAFDF5 0%, transparent 35%), radial-gradient(circle at 0% 100%, #EAFDF5 0%, transparent 30%)",
      }}
    >
      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#158A5E] flex items-center justify-center shadow-md shadow-[#158A5E]/20">
            <span className="text-white font-extrabold text-xl tracking-tighter">GP</span>
          </div>
          <div>
            <h2 className="text-[#158A5E] font-bold text-sm tracking-tight leading-none uppercase">
              GPEY
            </h2>
            <span className="text-[#667085] text-[10px] tracking-widest font-semibold">
              TELECOM
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#667085] bg-[#EAFDF5] px-3.5 py-1.5 rounded-full border border-[#158A5E]/10">
          Pre-Launch Access
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-6 pb-20 z-10 flex flex-col items-center">
        {/* HERO SECTION - FOCUSED CTA */}
        <div className="text-center w-full mb-12">
          <h1
            style={{ ...headingStyle, fontSize: "38px" }}
            className="text-[#158A5E] tracking-tight leading-[115%] mb-4 md:text-5xl max-w-2xl mx-auto"
          >
            🚀 BIG NEWS! GPEY TELECOM is launching soon — and early members are getting first
            access.
          </h1>

          <p
            style={bodyTextStyle}
            className="text-[#667085] text-base md:text-lg mb-8 max-w-xl mx-auto font-medium"
          >
            💚 Fast. Secure. Reliable. Built for Nigerians.
          </p>

          {/* Primary High-Impact CTA Button */}
          <div className="flex flex-col items-center gap-4 mb-4">
            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center gap-3 bg-[#158A5E] hover:bg-[#12724D] text-white px-10 py-5 rounded-full font-extrabold text-lg shadow-xl shadow-[#158A5E]/25 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 w-full sm:w-auto min-w-[280px]"
            >
              <MessageCircle className="w-6 h-6 fill-white text-[#158A5E] transition-transform group-hover:scale-110" />
              <span>Join Whatsapp group</span>
              <ChevronRight className="w-5 h-5 text-white/80 transition-transform group-hover:translate-x-1" />

              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-md animate-bounce">
                Join Free
              </span>
            </a>

            <p className="text-xs text-[#667085] font-semibold flex items-center gap-1.5 mt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Join now to lock in exclusive pre-launch benefits
            </p>
          </div>
        </div>

        {/* INSIDER PERKS - IMMEDIATELY UNDER THE HERO */}
        <div className="w-full bg-[#EAFDF5]/40 rounded-3xl p-6 md:p-8 border border-[#158A5E]/15 mb-14 shadow-sm">
          <div className="text-center mb-6">
            <h3
              style={{ ...headingStyle, fontSize: "24px" }}
              className="text-[#158A5E] font-semibold"
            >
              What WhatsApp Insiders Will Get:
            </h3>
            <p style={bodyTextStyle} className="text-[#667085] text-xs mt-1">
              Early member advantages before the official release
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#158A5E]/5 shadow-sm transition-all duration-200 hover:border-[#158A5E]/20"
              >
                <div className="w-9 h-9 rounded-full bg-[#EAFDF5] flex items-center justify-center shrink-0">
                  {benefit.icon}
                </div>
                <span
                  style={{ ...bodyTextStyle, fontSize: "15px" }}
                  className="text-[#158A5E] font-bold capitalize"
                >
                  {benefit.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* COMPANY SERVICES - POSITIONED LOWER DOWN */}
        <div className="w-full border-t border-[#158A5E]/10 pt-10">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[#667085] text-[11px] font-bold uppercase tracking-wider mb-3 border border-slate-200">
              <Smartphone className="w-3.5 h-3.5" /> GPEY Services List
            </span>
            <h3
              style={{ ...headingStyle, fontSize: "24px" }}
              className="text-[#158A5E] font-semibold"
            >
              Services Launching Soon
            </h3>
            <p style={bodyTextStyle} className="text-[#667085] text-sm mt-1">
              Everything you need in one secure Nigerian telecom app:
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-[#EAFDF5]/20 rounded-xl border border-[#158A5E]/5"
              >
                <Check className="w-3.5 h-3.5 text-[#158A5E] shrink-0" strokeWidth={3} />
                <span
                  style={{ ...bodyTextStyle, fontSize: "13px" }}
                  className="text-[#667085] font-semibold"
                >
                  {service}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center gap-6 text-xs text-[#667085] font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#158A5E]" /> Fast
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#158A5E]" /> Secure
            </span>
            <span className="flex items-center gap-1.5">⚡ Reliable</span>
          </div>
        </div>

        {/* Secondary bottom CTA for users who scrolled down */}
        <div className="mt-14 w-full text-center">
          <a
            href={WHATSAPP_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#EAFDF5] hover:bg-[#D1Fadf] text-[#158A5E] px-8 py-3.5 rounded-full font-bold text-sm border border-[#158A5E]/20 transition-all duration-300"
          >
            <MessageCircle className="w-4.5 h-4.5 fill-[#158A5E] text-[#EAFDF5]" />
            <span>Join Whatsapp group</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#158A5E]/10 py-6 bg-[#EAFDF5]/10 mt-12 z-10">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#158A5E] flex items-center justify-center">
              <span className="text-white font-extrabold text-sm tracking-tighter">GP</span>
            </div>
            <span className="text-xs font-bold text-[#158A5E]">GPEY Telecom Services</span>
          </div>

          <p
            style={{ ...bodyTextStyle, fontSize: "12px" }}
            className="text-[#667085] text-center sm:text-right"
          >
            © {new Date().getFullYear()} GPEY Telecom Services. Built for Nigerians.
          </p>
        </div>
      </footer>
    </div>
  );
}
