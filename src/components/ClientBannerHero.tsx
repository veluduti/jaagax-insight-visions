import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";
import PropertySearchBar from "@/components/PropertySearchBar";
import { useSavedLocation } from "@/hooks/useSavedLocation";
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
  Hotel,
  Building2,
  Lock,
  Star,
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
  const { savedLocation } = useSavedLocation();
  const [heroLocation, setHeroLocation] = useState(savedLocation?.city || "");

  const goComingSoon = (featureName: string) => () => navigate("/coming-soon", { state: { featureName } });

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "calc(100vh - 150px)",
          minHeight: "500px",
          maxHeight: "960px",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* ── Background ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${skylineImg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.48) 50%, rgba(0,0,0,0.62) 100%)",
            }}
          />
        </div>

        {/* ══════════════════════════════════════════════════
          MAIN BODY — fills full section
          LEFT (26%) | CENTER (48%) | RIGHT (26%)
      ══════════════════════════════════════════════════ */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            padding: "24px 0 0 0",
          }}
        >
          {/* ════════════ LEFT COLUMN ════════════ */}
          <div
            style={{
              width: "26%",
              padding: "0 20px 0 40px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              height: "100%",
              justifyContent: "center",
            }}
          >
            {/* Headline */}
            <div style={{ marginBottom: "6px" }}>
              <h1
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(36px, 3.6vw, 60px)",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.05,
                  margin: 0,
                }}
              >
                <span style={{ whiteSpace: "nowrap" }}>Your Dream</span>
                <br />
                <span style={{ color: "#22c55e", whiteSpace: "nowrap" }}>Place Awaits</span>
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  marginTop: "12px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  color: "rgba(255,255,255,0.82)",
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
                    flexShrink: 0,
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
                    flexShrink: 0,
                  }}
                />
                <span>GROW</span>
              </div>
            </div>

            {/* Feature cards */}
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
              {
                icon: ShieldCheck,
                title: "India's most trusted",
                desc: "intelligent property platform",
                onClick: () => {},
              },
            ].map((f) => (
              <motion.button
                key={f.title}
                whileHover={{ x: 4 }}
                onClick={f.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.09)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.16)",
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
                    borderRadius: "9px",
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
                      lineHeight: 1.25,
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.62)",
                      marginTop: "2px",
                    }}
                  >
                    {f.desc}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* ════════════ CENTER COLUMN ════════════ */}
          <div
            style={{
              width: "48%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "0 16px",
            }}
          >
            {/* Unified Property Search Bar - COMPACT VERSION */}
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  transform: "scale(0.72)",
                  transformOrigin: "center center",
                  width: "138%", // Compensate for scale reduction
                }}
              >
                <PropertySearchBar
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  compact={true} // ← ADD THIS LINE
                />
              </div>
            </div>

            {/* Book Hotel + Smart Financing */}
            <div style={{ display: "flex", gap: "14px", marginTop: "4px" }}>
              <button
                onClick={() => navigate("/hotels")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 24px",
                  borderRadius: "99px",
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.45)",
                }}
              >
                <Hotel size={15} /> Book Hotel
              </button>
              <button
                onClick={() => navigate("/smart-financing")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 24px",
                  borderRadius: "99px",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
                }}
              >
                <Building2 size={15} /> Smart Financing
              </button>
            </div>
          </div>

          {/* ════════════ RIGHT COLUMN ════════════
            Split into two sub-columns:
            [feature cards 18%] | [circular icons 58px fixed]
        ════════════ */}
          <div
            style={{
              width: "26%",
              height: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            {/* Feature cards — take all space except the icon strip */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingLeft: "8px",
                paddingRight: "12px",
              }}
            >
              {[
                {
                  icon: Wallet,
                  title: "Smart Financing",
                  badge: null,
                  lines: ["Pre-Approved", "Up to ₹5 Cr"],
                  accent: "#22c55e",
                  onClick: () => navigate("/smart-financing"),
                },
                {
                  icon: Users,
                  title: "Instant Match",
                  badge: null,
                  lines: ["Connect with right buyers & sellers"],
                  accent: "#3b82f6",
                  onClick: () => navigate("/ai-advisor"),
                },
                {
                  icon: Activity,
                  title: "Real-time Updates",
                  badge: null,
                  lines: ["on new properties"],
                  accent: "#a855f7",
                  onClick: goComingSoon("Real-time Updates"),
                },
              ].map((c) => (
                <motion.button
                  key={c.title}
                  whileHover={{ x: -3, scale: 1.01 }}
                  onClick={c.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "13px 16px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    /* subtle left accent border */
                    boxShadow: `inset 3px 0 0 ${c.accent}, 0 4px 16px rgba(0,0,0,0.15)`,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      background: `${c.accent}22`,
                      border: `1px solid ${c.accent}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <c.icon size={18} color={c.accent} strokeWidth={1.75} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#fff",
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </div>
                    {c.lines.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.65)",
                          marginTop: i === 0 ? "3px" : "1px",
                          lineHeight: 1.4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Circular icon buttons — fixed 68px wide strip on far right */}
            <div
              style={{
                width: "68px",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "18px",
                paddingRight: "8px",
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
                  label: "Expert\nSupport",
                  onClick: goComingSoon("Expert Support"),
                },
              ].map((a) => (
                <motion.button
                  key={a.label}
                  whileHover={{ scale: 1.08 }}
                  onClick={a.onClick}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "5px",
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
                      background: "rgba(255,255,255,0.12)",
                      backdropFilter: "blur(10px)",
                      border: "2px solid rgba(34,197,94,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 14px rgba(0,0,0,0.22)",
                    }}
                  >
                    <a.icon size={18} color="#fff" strokeWidth={1.75} />
                  </div>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      color: "#fff",
                      textAlign: "center",
                      lineHeight: 1.3,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {a.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
        STATS BAR — outside hero, always visible below it
    ══════════════════════════════════════════════════ */}
      <div
        style={{
          width: "100%",
          background: "rgba(8,12,18,0.97)",
          backdropFilter: "blur(14px)",
          padding: "0 48px",
          height: "62px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "16px",
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto",
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
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "11px" }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: "rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <s.icon size={15} color="#22c55e" strokeWidth={1.75} />
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
                    color: "rgba(255,255,255,0.58)",
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
  );
};

export default ClientBannerHero;
