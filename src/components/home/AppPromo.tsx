import { Gift, QrCode } from "lucide-react";
import appPhones from "@/assets/app-phones.png";

/** Static "Take Jaaga Everywhere" app promotion band. */
const AppPromo = () => (
  <section className="py-4">
    <div className="container mx-auto container-padding">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/15 border border-primary/15">
        <div className="relative grid items-center gap-6 p-6 md:grid-cols-[1fr_auto_auto] md:p-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Take Jaaga Everywhere</h2>
            <p className="mt-1 text-sm text-muted-foreground">Download our app for a faster, smarter and seamless experience.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { top: "GET IT ON", name: "Google Play", icon: "▶" },
                { top: "Download on the", name: "App Store", icon: "" },
              ].map((b) => (
                <span key={b.name} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-background">
                  <span className="text-xl leading-none">{b.icon}</span>
                  <span className="leading-tight">
                    <span className="block text-[9px] uppercase opacity-80">{b.top}</span>
                    <span className="block text-sm font-semibold">{b.name}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
          <img src={appPhones} alt="Jaaga mobile app" loading="lazy" width={960} height={688} className="hidden md:block h-44 w-auto object-contain" />
          <div className="flex items-center gap-4">
            <span className="grid h-24 w-24 place-items-center rounded-xl bg-card shadow-card">
              <QrCode className="h-16 w-16 text-foreground" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Scan QR Code</p>
              <p className="text-xs text-muted-foreground">to Download</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                <Gift className="h-5 w-5" />
                <span className="leading-tight text-xs">
                  <span className="block font-bold">Get ₹500 Bonus</span>
                  on First Booking
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default AppPromo;
