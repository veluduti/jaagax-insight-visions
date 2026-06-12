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
    /*
     * Fixed 1920×1080 viewport fill.
     * position:relative on the section; everything inside uses absolute or flex.
     */
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - 64px)" /* subtract navbar height */,
        minHeight: "700px",
        overflow: "hidden",
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
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

      {/* ── Body: left | center | right + right-edge icons ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          padding: "36px 0 0 0",
        }}
      >
        {/* ════════════ LEFT COLUMN (width ~26%) ════════════ */}
        <div
          style={{
            width: "26%",
            padding: "0 24px 0 40px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Big headline */}
          <div
            style={{
              marginBottom: "4px",
              width: "440px",
              maxWidth: "100%",
            }}
          >
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
              <span
                style={{
                  color: "#22c55e",
                  whiteSpace: "nowrap",
                }}
              >
                Place Awaits
              </span>
            </h1>

            {/* FIND • CONNECT • GROW */}
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
                padding: "11px 14px",
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
                  width: 38,
                  height: 38,
                  borderRadius: "9px",
                  background: "rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <f.icon size={17} color="#22c55e" strokeWidth={1.75} />
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

        {/* ════════════ CENTER COLUMN (width ~48%) ════════════ */}
        <div
          style={{
            width: "50%",
            display: "flex",
            transform: "translateY(-20px)",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 16px",
            gap: "0px",
          }}
        >
          {/* New Property Posted card */}
          <motion.button
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            onClick={() => navigate("/search?posted=24h")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "12px 18px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.97)",
              border: "1px solid #e5e7eb",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              cursor: "pointer",
              width: "100%",
              maxWidth: "460px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={20} color="#22c55e" />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>New Property Posted!</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "6px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 5,
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
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#fff",
                    background: "#22c55e",
                    padding: "3px 10px",
                    borderRadius: "99px",
                  }}
                >
                  Property Live <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </motion.button>

          {/* Smart Insights + Verified Properties pills */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            {[
              {
                icon: TrendingUp,
                label: "Smart Insights",
                onClick: () => navigate("/ai-advisor"),
              },
              {
                icon: ShieldCheck,
                label: "Verified Properties",
                onClick: () => navigate("/search?verified=1"),
              },
            ].map((p) => (
              <button
                key={p.label}
                onClick={p.onClick}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 16px",
                  borderRadius: "99px",
                  background: "rgba(255,255,255,0.97)",
                  color: "#111827",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.14)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <p.icon size={13} color="#22c55e" /> {p.label}
              </button>
            ))}
          </div>

          {/* Logo circle */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
              border: "3px solid rgba(34,197,94,0.4)",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                color: "#22c55e",
                fontWeight: 900,
                fontSize: "24px",
                lineHeight: 1,
              }}
            >
              X
            </span>
          </div>

          {/* Buy / Rent / New Projects / Commercial tabs */}
          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "rgba(255,255,255,0.13)",
              backdropFilter: "blur(8px)",
              borderRadius: "99px",
              padding: "4px",
              width: "100%",
              maxWidth: "460px",
              marginBottom: "12px",
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
                    navigate(`/${key === "new-projects" ? "new-projects" : key === "commercial" ? "commercial" : key}`);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: "99px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: isActive ? "#22c55e" : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.82)",
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
              background: "#fff",
              borderRadius: "99px",
              padding: "5px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              width: "100%",
              maxWidth: "460px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 14px",
              }}
            >
              <MapPin size={14} color="#9ca3af" />
              <input
                type="text"
                placeholder="Enter location, city or landmark"
                defaultValue="Hyderabad"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "13px",
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
                gap: "6px",
                padding: "9px 22px",
                background: "#22c55e",
                color: "#fff",
                borderRadius: "99px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Search size={13} /> Search
            </button>
          </div>

          {/* Book Hotel + Smart Financing – bigger pills */}
          <div style={{ display: "flex", gap: "14px" }}>
            <button
              onClick={() => navigate("/hotels")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 28px",
                borderRadius: "99px",
                background: "#2563eb",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(37,99,235,0.45)",
              }}
            >
              <Hotel size={16} /> Book Hotel
            </button>
            <button
              onClick={goComingSoon("Smart Financing")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "13px 28px",
                borderRadius: "99px",
                background: "#7c3aed",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
              }}
            >
              <Building2 size={16} /> Smart Financing
            </button>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN – feature cards (width ~20%) ════════════ */}
        <div
          style={{
            width: "20%",
            padding: "0 0 0 16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            justifyContent: "flex-start",
            /* push down to roughly align with search bar area */
            paddingTop: "150px",
          }}
        >
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
                gap: "12px",
                padding: "12px 14px",
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
                  width: 38,
                  height: 38,
                  borderRadius: "9px",
                  background: "rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <c.icon size={17} color="#22c55e" strokeWidth={1.75} />
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
                  {c.title}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.62)",
                    marginTop: "3px",
                    lineHeight: 1.45,
                  }}
                >
                  {c.desc}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* ════════════ FAR-RIGHT EDGE – circular icon buttons ════════════
            position:absolute so they always hug the right edge of the section
        ════════════ */}
        <div
          style={{
            position: "absolute",
            right: "20px",
            top: "36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            zIndex: 20,
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
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                  border: "2px solid rgba(34,197,94,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.22)",
                }}
              >
                <a.icon size={19} color="#fff" strokeWidth={1.75} />
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#fff",
                  textAlign: "center",
                  maxWidth: "56px",
                  lineHeight: 1.3,
                }}
              >
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ════════════ STATS BAR ════════════ */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          background: "rgba(8,12,18,0.93)",
          backdropFilter: "blur(12px)",
          padding: "18px 48px",
          marginTop: "-80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "16px",
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
                  width: 36,
                  height: 36,
                  borderRadius: "9px",
                  background: "rgba(34,197,94,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <s.icon size={17} color="#22c55e" strokeWidth={1.75} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "15px",
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
    </section>
  );
};

export default ClientBannerHero;
