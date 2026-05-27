import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageCircle,
  Check,
  Gift,
  Flame,
  Bell,
  TrendingUp,
  Zap,
  ShieldCheck,
  Users,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: "GPEY TELECOM SERVICES — Early Access Community" },
      {
        name: "description",
        content:
          "Join GPEY TELECOM SERVICES WhatsApp community for exclusive launch offers, airtime & data discounts, bill payments, and early user benefits.",
      },
      { property: "og:title", content: "GPEY TELECOM SERVICES — Early Access Community" },
      {
        property: "og:description",
        content:
          "Get early access to airtime, data, CAC registration, OTPs, and exclusive launch bonuses on GPEY Telecom.",
      },
    ],
  }),
  component: PromoPage,
});

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/Lcve8KrVipQBoW6CiReDY4?mode=gi_t";

// Typography Style Objects based on user guide specifications
const bodyTextStyle = {
  fontFamily: "'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 400,
  fontSize: "16px",
  lineHeight: "145%",
  letterSpacing: "0em",
};

const headingStyle = {
  fontFamily: "'SF Compact', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontWeight: 556,
  letterSpacing: "-0.04em",
  lineHeight: "120%",
};

function PromoPage() {
  const [hoveredBenefit, setHoveredBenefit] = useState<number | null>(null);

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
      icon: <Gift className="w-6 h-6 text-[#158A5E]" />,
      title: "Launch Bonuses",
      desc: "Get exclusive cashbacks and airtime multipliers on day one of our launch.",
      badge: "🎁 Gift",
    },
    {
      icon: <Flame className="w-6 h-6 text-[#158A5E]" />,
      title: "Exclusive Offers",
      desc: "Insider-only discounted rates on data bundles and SMM services.",
      badge: "🔥 Hot",
    },
    {
      icon: <Bell className="w-6 h-6 text-[#158A5E]" />,
      title: "Instant Updates",
      desc: "Be the very first to know when new services, nodes, and APIs go live.",
      badge: "📢 Alert",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-[#158A5E]" />,
      title: "Early Access Deals",
      desc: "First priority queue for static account setups and CAC registrations.",
      badge: "💸 Alpha",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white text-[#158A5E] overflow-x-hidden flex flex-col justify-between selection:bg-[#158A5E]/10 selection:text-[#158A5E]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, #EAFDF5 0%, transparent 40%), radial-gradient(circle at 0% 100%, #EAFDF5 0%, transparent 35%)",
      }}
    >
      {/* Dynamic Top Announcement Bar */}
      <div className="bg-[#158A5E] text-white text-xs font-semibold py-2 px-4 text-center tracking-wide flex items-center justify-center gap-1.5 shadow-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping"></span>
        <span>EXCLUSIVELY FOR NIGERIANS • JOIN THE PRE-LAUNCH TEAM TODAY</span>
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
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
        <a
          href={WHATSAPP_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#158A5E] hover:text-[#12724D] border border-[#158A5E]/20 hover:border-[#158A5E] px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-1 bg-white/50 backdrop-blur-sm"
        >
          Community Link <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* Main Hero and Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-8 pb-16 z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAFDF5] text-[#158A5E] text-xs font-bold uppercase tracking-wider mb-6 animate-pulse border border-[#158A5E]/10">
            🚀 Coming Soon
          </span>

          <h1
            style={{ ...headingStyle, fontSize: "40px" }}
            className="text-[#158A5E] tracking-tight leading-[115%] mb-6 md:text-5xl"
          >
            BIG NEWS! GPEY TELECOM is launching soon — and early members are getting first access.
          </h1>

          <p style={bodyTextStyle} className="text-[#667085] max-w-xl mx-auto mb-8">
            We're preparing something BIG. Join our WhatsApp community now to be among the first to
            experience Nigeria's fastest, most reliable telecom partner.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center gap-2.5 bg-[#158A5E] hover:bg-[#12724D] text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-[#158A5E]/25 transition-all duration-300 transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <MessageCircle className="w-5.5 h-5.5 transition-transform group-hover:scale-110" />
              <span>Send WhatsApp Message</span>
              <ChevronRight className="w-4 h-4 text-white/70 transition-transform group-hover:translate-x-1" />

              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm animate-bounce">
                Free
              </span>
            </a>

            <span className="text-xs text-[#667085] font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#158A5E] inline-block"></span>
              Join 450+ members already waiting
            </span>
          </div>
        </div>

        {/* Feature List Grid */}
        <div className="bg-[#EAFDF5]/40 rounded-3xl p-8 border border-[#158A5E]/10 mb-16 shadow-inner">
          <div className="text-center mb-8">
            <h3
              style={{ ...headingStyle, fontSize: "28px" }}
              className="text-[#158A5E] mb-2 font-semibold"
            >
              What You'll Enjoy At Launch
            </h3>
            <p style={bodyTextStyle} className="text-[#667085] text-sm">
              One dashboard. Instant delivery. Unmatched stability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#158A5E]/5 shadow-sm transition-all duration-200 hover:border-[#158A5E]/20 hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-[#158A5E]/10 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-[#158A5E]" strokeWidth={3} />
                </div>
                <span
                  style={{ ...bodyTextStyle, fontSize: "15px" }}
                  className="text-[#158A5E] font-medium"
                >
                  {service}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[#158A5E]/10 text-center flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#158A5E]" />
              <span className="text-sm font-semibold">Fast & Automated</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#158A5E]/30"></div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#158A5E]" />
              <span className="text-sm font-semibold">Secure & CAC Compliant</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#158A5E]/30"></div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#158A5E]" />
              <span className="text-sm font-semibold">Built for Nigerians</span>
            </div>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="mb-16">
          <div className="text-center mb-10 max-w-md mx-auto">
            <h3
              style={{ ...headingStyle, fontSize: "32px" }}
              className="text-[#158A5E] mb-2 font-semibold"
            >
              WhatsApp Insider Perks
            </h3>
            <p style={bodyTextStyle} className="text-[#667085] text-sm">
              We’re preparing something BIG, and our WhatsApp insiders will get exclusive launch-day
              privileges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  hoveredBenefit === index
                    ? "bg-[#EAFDF5] border-[#158A5E] shadow-lg shadow-[#158A5E]/5 translate-y-[-2px]"
                    : "bg-white border-[#158A5E]/10 shadow-sm"
                }`}
                onMouseEnter={() => setHoveredBenefit(index)}
                onMouseLeave={() => setHoveredBenefit(null)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EAFDF5] border border-[#158A5E]/10 flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#EAFDF5] border border-[#158A5E]/5 text-[#158A5E]">
                    {benefit.badge}
                  </span>
                </div>
                <h4
                  style={{ ...headingStyle, fontSize: "20px" }}
                  className="text-[#158A5E] mb-2 font-semibold"
                >
                  {benefit.title}
                </h4>
                <p style={bodyTextStyle} className="text-[#667085] text-sm leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Block */}
        <div className="bg-[#158A5E] text-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-xl shadow-[#158A5E]/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)]"></div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <h3
              style={{ ...headingStyle, fontSize: "36px" }}
              className="text-white tracking-tight leading-[115%] mb-4"
            >
              Ready to Lock in Your Early User Benefits?
            </h3>
            <p
              style={{ ...bodyTextStyle, fontSize: "16px" }}
              className="text-white/80 max-w-lg mx-auto mb-8"
            >
              Click the button below to send your WhatsApp message and join GPEY TELECOM SERVICES
              before the official launch. Spots are filling up fast!
            </p>

            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-white/95 text-[#158A5E] px-8 py-4 rounded-full font-bold shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <MessageCircle className="w-5.5 h-5.5 fill-[#158A5E] text-white" />
              <span>Send WhatsApp Message</span>
              <ChevronRight className="w-4 h-4 text-[#158A5E] transition-transform" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#158A5E]/10 py-8 bg-[#EAFDF5]/10 mt-12 z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#158A5E] flex items-center justify-center">
              <span className="text-white font-extrabold text-base tracking-tighter">GP</span>
            </div>
            <span className="text-sm font-bold text-[#158A5E]">GPEY Telecom Services</span>
          </div>

          <p
            style={{ ...bodyTextStyle, fontSize: "13px" }}
            className="text-[#667085] text-center md:text-right"
          >
            © {new Date().getFullYear()} GPEY Telecom Services. Fast. Secure. Reliable. Built for
            Nigerians.
          </p>
        </div>
      </footer>
    </div>
  );
}
