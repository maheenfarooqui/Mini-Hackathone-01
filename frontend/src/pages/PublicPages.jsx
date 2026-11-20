import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleCheck,
  Menu,
  PackageCheck,
  ShieldCheck,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { BrandName, Button, Field } from "../components/UI.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiError } from "../api/axios.js";

const features = [
  {
    icon: Boxes,
    title: "Inventory, without the guesswork",
    copy: "Know what is on hand, where it is stored, and what needs attention before it becomes a problem.",
  },
  {
    icon: Warehouse,
    title: "Every warehouse, one view",
    copy: "Keep teams aligned across locations with warehouse-level stock and clear movement records.",
  },
  {
    icon: Truck,
    title: "A smoother supply chain",
    copy: "Connect supplier requests and sales orders to the inventory that powers your operation.",
  },
];

export function LandingPage() {
  const { user, loading } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  if (!loading && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen overflow-hidden bg-ink">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-[78px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <Link to="/" className="text-[17px]">
            <BrandName className="brand-name--inverse" />
          </Link>
          <nav className="hidden items-center gap-8 text-xs font-medium text-white/75 md:flex">
            <a href="#platform" className="transition hover:text-copy">Platform</a>
            <a href="#how-it-works" className="transition hover:text-copy">How it works</a>
            <a href="#footer" className="transition hover:text-copy">About</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="px-3 py-2 text-xs font-semibold text-white/75 transition hover:text-white">
              Log in
            </Link>
            <Link to="/register">
              <Button size="sm" className="px-4">Get started <ArrowUpRight size={14} /></Button>
            </Link>
          </div>
          <button
            onClick={() => setMobileMenu((open) => !open)}
            className="rounded-lg border border-white/30 p-2 text-white md:hidden"
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
          >
            {mobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {mobileMenu && (
          <div className="mx-4 rounded-2xl border border-line bg-panel p-4 shadow-xl md:hidden">
            <div className="flex flex-col gap-1">
              <a href="#platform" className="rounded-lg px-3 py-2.5 text-sm text-muted" onClick={() => setMobileMenu(false)}>Platform</a>
              <a href="#how-it-works" className="rounded-lg px-3 py-2.5 text-sm text-muted" onClick={() => setMobileMenu(false)}>How it works</a>
              <Link to="/login" className="rounded-lg px-3 py-2.5 text-sm text-muted">Log in</Link>
              <Link to="/register" className="mt-2"><Button className="w-full">Get started <ArrowRight size={15} /></Button></Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-photo relative min-h-[720px] overflow-hidden pt-28 sm:min-h-[790px]">
          <div className="hero-grid absolute inset-0 opacity-60" />
          <div className="absolute -left-44 top-44 h-[460px] w-[460px] rounded-full bg-orange/10 blur-[120px]" />
          <div className="relative mx-auto grid min-h-[620px] max-w-[1320px] items-center gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="max-w-[660px]"
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-orange/25 bg-orange/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-orange">
                <span className="h-1.5 w-1.5 rounded-full bg-orange" />
                Inventory, in control
              </div>
              <h1 className="max-w-[650px] text-[clamp(3.2rem,7.3vw,6.6rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white">
                Built for the
                <br />
                <span className="text-orange">move</span> of business.
              </h1>
              <p className="mt-7 max-w-[500px] text-base leading-7 text-slate-300/80 sm:text-lg sm:leading-8">
                Inventory operations move fast. Keep every product, warehouse, supplier and order moving in the same direction.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/register">
                  <Button size="lg">Start managing smarter <ArrowRight size={16} /></Button>
                </Link>
                <a href="#platform" className="inline-flex min-h-12 items-center gap-2 px-4 text-sm font-medium text-white/80 transition hover:text-white">
                  Explore the platform <ArrowDown size={15} />
                </a>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-5 text-[11px] text-muted">
                {["Real-time stock visibility", "Role-based access", "One connected operation"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={13} className="text-orange" /> {item}
                  </span>
                ))}
              </div>
              <div className="glass mt-6 w-[250px] border border-white/10 p-4 shadow-xl">
                <p className="text-[10px] font-medium text-muted">Connected operations</p>
                <p className="mt-2 text-sm font-semibold text-white">From supplier to shipment.</p>
                <div className="mt-4 flex items-center">
                  {["S", "W", "O"].map((item, index) => (
                    <span key={item} className={`mr-1.5 flex h-7 w-7 items-center justify-center border border-white/20 text-[9px] font-bold ${index === 0 ? "bg-orange text-white" : "bg-white/10 text-white"}`}>{item}</span>
                  ))}
                  <span className="ml-1 text-[9px] text-muted">Supplier · Warehouse · Orders</span>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative hidden min-h-[460px] lg:block"
            >
              <div className="absolute right-2 top-10 w-full max-w-[485px] rounded-3xl border border-white/15 bg-[#111b20]/75 p-5 shadow-[0_35px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange">Operations snapshot</p>
                    <p className="mt-1 text-sm font-semibold text-white">Your warehouse, at a glance</p>
                  </div>
                  <span className="rounded-lg border border-white/10 p-2 text-muted"><PackageCheck size={16} /></span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Inventory visibility", "Every location"],
                    ["Stock movements", "Tracked as they happen"],
                    ["Order flow", "Connected end to end"],
                    ["Team access", "Built around your role"],
                  ].map(([label, detail], index) => (
                    <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <span className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${index === 0 ? "bg-orange/15 text-orange" : "bg-white/5 text-slate-300"}`}>
                        {index === 0 ? <Boxes size={15} /> : index === 1 ? <ArrowRight size={15} /> : index === 2 ? <Truck size={15} /> : <ShieldCheck size={15} />}
                      </span>
                      <p className="text-[11px] font-semibold text-white">{label}</p>
                      <p className="mt-1 text-[10px] text-muted">{detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-orange/15 bg-orange/[0.07] p-3.5">
                  <div className="flex items-center gap-3">
                    <CircleCheck size={17} className="text-orange" />
                    <span className="text-xs font-medium text-slate-200">One source of truth for stock.</span>
                  </div>
                  <ChevronRight size={15} className="text-orange" />
                </div>
              </div>
            </motion.div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange/40 to-transparent" />
        </section>

        <section id="platform" className="relative mx-auto max-w-[1320px] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mb-12 grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-orange">Your operation, connected</p>
              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-copy sm:text-4xl">Less chasing. More moving.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted md:justify-self-end">
              Manage Your Goods gives each team the right view of the same operation—from a single product to your warehouse network.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {features.map(({ icon: Icon, title, copy }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.08 }}
                className="group rounded-2xl border border-line/80 bg-panel/65 p-6 transition hover:border-orange/30 hover:bg-panel sm:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange/20 bg-orange/10 text-orange transition group-hover:bg-orange group-hover:text-white">
                  <Icon size={19} />
                </span>
                <h3 className="mt-7 text-base font-semibold text-copy">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
                <span className="mt-7 flex items-center gap-2 text-xs font-semibold text-orange">
                  Learn more <ArrowUpRight size={14} />
                </span>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-line/70 bg-panel/45">
          <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-20 sm:px-8 sm:py-24 md:grid-cols-2 md:items-center">
            <div className="relative min-h-[270px] overflow-hidden rounded-3xl border border-line bg-card p-7 sm:p-9">
              <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-orange/10 blur-3xl" />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-orange">Built around your people</p>
              <div className="relative mt-8 space-y-3">
                {[
                  ["Admin", "Configure the operation"],
                  ["Warehouse manager", "Keep stock moving"],
                  ["Supplier", "Coordinate replenishment"],
                  ["Sales representative", "Create and track orders"],
                ].map(([role, task], i) => (
                  <div key={role} className="flex items-center justify-between rounded-xl border border-line/60 bg-ink/50 px-4 py-3">
                    <span className="flex items-center gap-3 text-xs font-medium text-copy">
                      <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-orange" : "bg-muted/70"}`} />
                      {role}
                    </span>
                    <span className="text-[10px] text-muted">{task}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-orange">A clearer way to work</p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-copy sm:text-4xl">The right tools for every role.</h2>
              <p className="mt-5 text-sm leading-7 text-muted">
                Give administrators, warehouse managers, suppliers and sales teams a dedicated workspace—with permissions that keep your data and processes in the right hands.
              </p>
              <Link to="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-orange hover:text-orange-300">
                Bring your team together <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl border border-orange/20 bg-gradient-to-br from-orange/15 via-panel to-panel px-6 py-12 text-center sm:px-12 sm:py-16">
            <div className="absolute -right-14 -top-28 h-72 w-72 rounded-full bg-orange/10 blur-3xl" />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-orange">Take control of your inventory</p>
            <h2 className="relative mx-auto mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-copy sm:text-4xl">
              Make your next move a smarter one.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
              Bring your inventory and warehouse workflows into one connected workspace.
            </p>
            <Link to="/register" className="relative mt-7 inline-block">
              <Button size="lg">Create your account <ArrowRight size={16} /></Button>
            </Link>
          </div>
        </section>
      </main>
      <footer id="footer" className="border-t border-line/70">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-7 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/"><BrandName /></Link>
          <p>Clarity for every part of your supply chain.</p>
          <p>© {new Date().getFullYear()} Manage Your Goods</p>
        </div>
      </footer>
    </div>
  );
}

export function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  if (!loading && user) return <Navigate to="/app" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(values);
        toast.success("Account created. Welcome to Manage Your Goods.");
      } else {
        await login(values);
        toast.success("Welcome back.");
      }
      navigate("/app", { replace: true });
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4 py-12">
      <div className="hero-grid absolute inset-0 opacity-50" />
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-orange/10 blur-[120px]" />
      <Link to="/" className="absolute left-5 top-6 z-10 text-[17px] sm:left-8 sm:top-8">
        <BrandName />
      </Link>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[460px] rounded-3xl border border-line bg-panel/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-9"
      >
        <div className="mb-7">
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-orange/20 bg-orange/10 text-orange">
            {isRegister ? <Boxes size={20} /> : <ShieldCheck size={20} />}
          </span>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange">
            {isRegister ? "Get started" : "Welcome back"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-copy">
            {isRegister ? "Create your account" : "Sign in to your workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isRegister
              ? "Create a sales representative account to place and manage orders."
              : "Enter your credentials to continue to Manage Your Goods."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <Field label="Full name" name="name" autoComplete="name" placeholder="Your name" required maxLength={100} />
              <Field label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+92 300 0000000" maxLength={30} />
            </>
          )}
          <Field label="Email address" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
            required
            minLength={isRegister ? 8 : undefined}
          />
          {isRegister && (
            <div className="rounded-xl border border-line bg-ink/45 px-3.5 py-3 text-[11px] leading-5 text-muted">
              Account type <span className="float-right font-semibold text-copy">Sales representative</span>
              <span className="mt-1 block">Other team roles are created by your administrator.</span>
            </div>
          )}
          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            {!submitting && <ArrowRight size={15} />}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          {isRegister ? "Already have an account?" : "New to Manage Your Goods?"}{" "}
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-semibold text-orange transition hover:text-orange-300"
          >
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
        <div className="mt-7 border-t border-line pt-5 text-center text-[10px] text-muted/70">
          Your account is protected with secure, role-based access.
        </div>
      </motion.section>
    </main>
  );
}
