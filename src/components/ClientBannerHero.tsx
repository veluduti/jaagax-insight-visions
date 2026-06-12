import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  ShieldCheck,
  IndianRupee,
  Search,
  Heart,
  Headphones,
  Wallet,
  Users,
  Activity,
  TrendingUp,
  CheckCircle2,
  Hotel,
  Building2,
  Lock,
  Star,
  ArrowRight,
  MapPin,
} from "lucide-react";
import skylineImg from "@/assets/hero-skyline.jpg";

interface Props {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showSearchBar?: boolean;
}

const ClientBannerHero = ({
  activeTab = "buy",
  onTabChange = () => {},
  showSearchBar: _showSearchBar = true,
}: Props) => {
  const navigate = useNavigate();

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* ── Background ── */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${skylineImg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
      </div>

      {/* ── Main layout wrapper ── */}
      <div className="relative z-10 flex flex-col" style={{ minHeight: "100vh" }}>
        {/* ══════════════════════════════════════════════
            TOP AREA  –  3 columns
            LEFT (25%) | CENTER (50%) | RIGHT (25%)
        ══════════════════════════════════════════════ */}
        <div className="flex flex-1 gap-0" style={{ padding: "32px 40px 0 40px" }}>
          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-3" style={{ width: "25%", paddingRight: "20px" }}>
            {/* Headline */}
            <div style={{ marginBottom: "8px" }}>
              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(28px, 3.5vw, 52px)",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Your Dream
                <br />
                <span style={{ color: "#22c55e" }}>Place Awaits</span>
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <span>FIND</span>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "inline-block",
                  }}
                />
                <span>CONNECT</span>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "inline-block",
                  }}
                />
                <span>GROW</span>
              </div>
            </div>

            {/* Feature cards – left */}
            {[
              {
                icon: Brain,
                title: "AI-Powered Insights",
                desc: "Smart recommendations just for you.",
                onClick: () => navigate("/ai-advisor"),
              },
              {
                icon: ShieldCheck,
                title: "100% Verified Properties",
                desc: "Ensuring trust and transparency.",
                onClick: () => navigate("/search?verified=1"),
              },
              {
                icon: IndianRupee,
                title: "Zero Hidden Costs",
                desc: "What you see is what you get.",
                onClick: () => navigate("/valuation"),
              },
            ].map((f) => (
              <motion.button
                key={f.title}
                whileHover={{ x: 4 }}
                onClick={f.onClick}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    background: "rgba(34,197,94,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <f.icon size={16} color="#22c55e" strokeWidth={1.75} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.2,
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.65)",
                      marginTop: "2px",
                    }}
                  >
                    {f.desc}
                  </div>
                </div>
              </motion.button>
            ))}

            {/* India's most trusted */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  background: "rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={16} color="#22c55e" strokeWidth={1.75} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  India's most trusted
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.65)",
                    marginTop: "2px",
                  }}
                >
                  intelligent property platform
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN ── */}
          <div
            className="flex flex-col items-center"
            style={{ width: "50%", paddingLeft: "10px", paddingRight: "10px" }}
          >
            {/* New Property Posted card */}
            <motion.button
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => navigate("/search?posted=24h")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.97)",
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                cursor: "pointer",
                width: "100%",
                maxWidth: "400px",
                alignSelf: "center",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(34,197,94,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={18} color="#22c55e" />
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  New Property Posted!
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "5px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: "99px",
                      background: "#e5e7eb",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "66%",
                        background: "#22c55e",
                        borderRadius: "99px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#fff",
                      background: "#22c55e",
                      padding: "2px 8px",
                      borderRadius: "99px",
                    }}
                  >
                    Property Live <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Smart Insights + Verified Properties pills */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <button
                onClick={() => navigate("/ai-advisor")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 14px",
                  borderRadius: "99px",
                  background: "rgba(255,255,255,0.97)",
                  color: "#111827",
                  fontSize: "11px",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <TrendingUp size={12} color="#22c55e" /> Smart Insights
              </button>
              <button
                onClick={() => navigate("/search?verified=1")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 14px",
                  borderRadius: "99px",
                  background: "rgba(255,255,255,0.97)",
                  color: "#111827",
                  fontSize: "11px",
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ShieldCheck size={12} color="#22c55e" /> Verified Properties
              </button>
            </div>

            {/* Logo */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                border: "3px solid rgba(34,197,94,0.35)",
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  color: "#22c55e",
                  fontWeight: 900,
                  fontSize: "22px",
                  lineHeight: 1,
                }}
              >
                X
              </span>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                borderRadius: "99px",
                padding: "4px",
                width: "100%",
                maxWidth: "420px",
                marginBottom: "10px",
              }}
            >
              {["Buy", "Rent", "New Projects", "Commercial"].map((tab) => {
                const key = tab.toLowerCase().replace(" ", "-");
                const isActive = activeTab === key;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(key);
                      navigate(
                        `/${key === "new-projects" ? "new-projects" : key === "commercial" ? "commercial" : key}`,
                      );
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      borderRadius: "99px",
                      fontSize: "11px",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? "#22c55e" : "transparent",
                      color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
                      transition: "all 0.2s",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div
              style={{
                display: "flex",
                gap: 0,
                background: "#fff",
                borderRadius: "99px",
                padding: "4px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
                width: "100%",
                maxWidth: "420px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0 12px",
                }}
              >
                <MapPin size={13} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Enter location, city or landmark"
                  defaultValue="Hyderabad"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "12px",
                    color: "#374151",
                    padding: "6px 0",
                  }}
                />
              </div>
              <button
                onClick={() => navigate("/search")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 18px",
                  background: "#22c55e",
                  color: "#fff",
                  borderRadius: "99px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Search size={12} /> Search
              </button>
            </div>

            <button
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.65)",
                fontSize: "10px",
                cursor: "pointer",
                alignSelf: "flex-start",
                paddingLeft: "14px",
                marginBottom: "14px",
              }}
            >
              + More Filters
            </button>

            {/* Book Hotel + Smart Financing buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => navigate("/hotels")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 14px",
                  borderRadius: "99px",
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.4)",
                }}
              >
                <Hotel size={13} /> Book Hotel
              </button>
              <button
                onClick={goComingSoon("Smart Financing")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "7px 14px",
                  borderRadius: "99px",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(124,58,237,0.4)",
                }}
              >
                <Building2 size={13} /> Smart Financing
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-3" style={{ width: "25%", paddingLeft: "20px" }}>
            {/* Circular action buttons: Search, Shortlist, Expert Support */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                alignItems: "flex-end",
              }}
            >
              {[
                {
                  icon: Search,
                  label: "Search",
                  onClick: () => navigate("/search"),
                },
                {
                  icon: Heart,
                  label: "Shortlist",
                  onClick: () => navigate("/dashboard/buyer"),
                },
                {
                  icon: Headphones,
                  label: "Expert Support",
                  onClick: goComingSoon("Expert Support"),
                },
              ].map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.07 }}
                  onClick={a.onClick}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(8px)",
                      border: "2px solid rgba(34,197,94,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                    }}
                  >
                    <a.icon size={18} color="#fff" strokeWidth={1.75} />
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {a.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Right feature cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                {
                  icon: Wallet,
                  title: "Smart Financing",
                  desc: (
                    <>
                      <div>Pre-Approved</div>
                      <div>Up to ₹5 Cr</div>
                    </>
                  ),
                  onClick: goComingSoon("Smart Financing"),
                },
                {
                  icon: Users,
                  title: "Instant Match",
                  desc: <div>Connect with right buyers & sellers</div>,
                  onClick: () => navigate("/ai-advisor"),
                },
                {
                  icon: Activity,
                  title: "Real-time Updates",
                  desc: <div>on new properties</div>,
                  onClick: goComingSoon("Real-time Updates"),
                },
              ].map((c) => (
                <motion.button
                  key={c.title}
                  whileHover={{ x: -3 }}
                  onClick={c.onClick}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: "8px",
                      background: "rgba(34,197,94,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <c.icon size={16} color="#22c55e" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.2,
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.65)",
                        marginTop: "2px",
                        lineHeight: 1.4,
                      }}
                    >
                      {c.desc}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            STATS BAR  –  dark strip at the bottom
        ══════════════════════════════════════════ */}
        <div
          style={{
            margin: "32px 0 0 0",
            background: "rgba(10,14,20,0.92)",
            backdropFilter: "blur(10px)",
            padding: "16px 40px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "12px",
            }}
          >
            {[
              { icon: ShieldCheck, value: "50K+", label: "Verified Properties" },
              { icon: Users, value: "100K+", label: "Happy Customers" },
              { icon: TrendingUp, value: "AI Powered", label: "Smart Insights" },
              { icon: Lock, value: "100%", label: "Secure & Transparent" },
              { icon: Headphones, value: "24/7", label: "Expert Support" },
              { icon: Star, value: "4.8/5", label: "User Rating" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    background: "rgba(34,197,94,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <s.icon size={16} color="#22c55e" strokeWidth={1.75} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.2,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.6)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientBannerHero;
