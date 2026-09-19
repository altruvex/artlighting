"use client";
import { Button } from "@/components/ui/button";
import { DASHBOARDS } from "@/constant";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

const Layout = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("Nav");
  const tShell = useTranslations("Shell");
  const [isOpen, setIsOpen] = useState(true);
  const pathName = usePathname();
  const toggleSideBar = () => {
    setIsOpen(!isOpen);
  };
  const sidebarVariants = {
    open: {
      width: 264,
      opacity: 1,
      transition: {
        duration: 0.3,
      },
    },
    closed: {
      width: 0,
      opacity: 0,
      transition: {
        duration: 0.3,
      },
    },
  };
  return (
    <div className="relative z-50">
      <motion.aside
        initial={false}
        animate={isOpen ? "open" : "closed"}
        variants={sidebarVariants}
        className="glass-surface fixed start-0 top-0 z-40 h-screen overflow-hidden border-e border-border"
        style={{ width: isOpen ? 264 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">A</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{tShell("brand")}</h2>
              <p className="text-xs text-muted-foreground">{tShell("admin")}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {DASHBOARDS.map((dash) => {
              const isCurrent = pathName.endsWith(dash.url);
              return (
                <Link
                  key={dash.key}
                  href={dash.url}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {dash.icon}
                  <span>{t(dash.key)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4">
            <LanguageSwitcher />
          </div>
        </div>
      </motion.aside>
      <Button
        onClick={toggleSideBar}
        size="icon"
        variant="secondary"
        className={cn(
          "fixed top-5 z-50 h-8 w-8 rounded-full shadow-md transition-all duration-300",
          isOpen ? "start-[248px]" : "start-4",
        )}
        aria-label={isOpen ? tShell("closeSidebar") : tShell("openSidebar")}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        ) : (
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        )}
      </Button>
      <div
        className={cn("transition-all duration-300", isOpen ? "lg:ps-[264px]" : "ps-0")}
      >
        {children}
      </div>
    </div>
  );
};

export default Layout;
