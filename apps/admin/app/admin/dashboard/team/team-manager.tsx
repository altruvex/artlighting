"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check } from "lucide-react";
import { createStaffAccount, updateAdminRole, revokeAdminAccess } from "@/lib/actions/staff";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

function generateSecurePassword(length = 20) {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

export default function TeamManager({
  admins,
  currentAdminId,
}: {
  admins: Admin[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const t = useTranslations("Team");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [copied, setCopied] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(
    null
  );

  function run(fn: () => Promise<unknown>, msg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(msg);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon("genericError"));
      }
    });
  }

  function handleGeneratePassword() {
    setPassword(generateSecurePassword());
  }

  function handleCreate() {
    if (!name || !email || !password) {
      toast.error(t("toasts.fillRequired"));
      return;
    }
    startTransition(async () => {
      try {
        await createStaffAccount({ email, name, password, role });
        setLastCreated({ email, password });
        setName("");
        setEmail("");
        setPassword("");
        setRole("staff");
        toast.success(t("toasts.accountCreated"));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("toasts.createFailed"));
      }
    });
  }

  return (
    <Container>
      <Card className="max-w-xl mb-6 glass-surface rounded-2xl">
        <CardHeader>
          <CardTitle>{t("addTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("addDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>{tCommon("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{tCommon("email")}</Label>
              <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("password")}</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                {t("generate")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "owner" | "staff")}>
              <SelectTrigger className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">{t("roleOptions.staff")}</SelectItem>
                <SelectItem value="owner">{t("roleOptions.owner")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button disabled={isPending} onClick={handleCreate}>
            {t("createAccount")}
          </Button>

          {lastCreated && (
            <div className="border rounded-lg p-3 bg-muted/40 space-y-1">
              <p className="text-sm font-medium">
                {t("createdNotice", { email: lastCreated.email })}
              </p>
              <div className="flex items-center gap-2">
                <code dir="ltr" className="text-sm bg-background border rounded px-2 py-1 flex-1 overflow-x-auto">
                  {lastCreated.password}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={t("copyPassword")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastCreated.password);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-surface rounded-2xl">
        <CardHeader>
          <CardTitle>{t("adminsTitle", { count: admins.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between border rounded-lg p-2">
              <div>
                <p className="font-medium">
                  {admin.name}{" "}
                  {admin.id === currentAdminId && (
                    <span className="text-xs text-muted-foreground">{t("you")}</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={admin.role === "owner" ? "default" : "secondary"}>
                  {t(`roles.${admin.role as "owner" | "staff"}`)}
                </Badge>
                {admin.id !== currentAdminId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(
                          () =>
                            updateAdminRole(
                              admin.id,
                              admin.role === "owner" ? "staff" : "owner"
                            ),
                          t("toasts.roleUpdated")
                        )
                      }
                    >
                      {admin.role === "owner" ? t("makeStaff") : t("makeOwner")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => run(() => revokeAdminAccess(admin.id), t("toasts.accessRevoked"))}
                    >
                      {t("revoke")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}
