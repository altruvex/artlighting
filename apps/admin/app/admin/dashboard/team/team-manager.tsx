"use client";

import { type AdminColumn, ColumnHeader, DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import UserAvatar from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffAccount, revokeAdminAccess, updateAdminRole } from "@/lib/actions/staff";
import type { AdminRole } from "@repo/database";
import { CheckIcon, CopyIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

export interface TeamRow extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
  isCurrent: boolean;
}

function generateSecurePassword(length = 20) {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

export default function TeamManager({ admins }: { admins: TeamRow[] }) {
  const router = useRouter();
  const t = useTranslations("Team");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [copied, setCopied] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  const [pendingRole, setPendingRole] = useState<TeamRow | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<TeamRow | null>(null);

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

  const columns = useMemo<AdminColumn<TeamRow>[]>(
    () => [
      {
        id: "member",
        accessorFn: (row) => `${row.name} ${row.email}`,
        filterFn: "includesString",
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.member")} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.original.name} email={row.original.email} />
            <span className="grid min-w-0 leading-tight">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-medium">{row.original.name}</span>
                {row.original.isCurrent && <StatusBadge tone="info">{t("you")}</StatusBadge>}
              </span>
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {row.original.email}
              </span>
            </span>
          </div>
        ),
      },
      {
        id: "role",
        accessorFn: (row) => row.role,
        filterFn: "arrIncludesSome",
        enableSorting: false,
        header: ({ column }) => <ColumnHeader column={column} title={t("role")} />,
        cell: ({ row }) => (
          <StatusBadge tone={row.original.role === "owner" ? "success" : "neutral"}>
            {t(`roles.${row.original.role}`)}
          </StatusBadge>
        ),
      },
      {
        id: "added",
        accessorFn: (row) => row.createdAt.getTime(),
        header: ({ column }) => <ColumnHeader column={column} title={t("columns.added")} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {format.dateTime(row.original.createdAt, { dateStyle: "medium" })}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) =>
          row.original.isCurrent ? null : (
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                disabled={isPending}
                onClick={() => setPendingRole(row.original)}
              >
                {row.original.role === "owner" ? t("makeStaff") : t("makeOwner")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => setPendingRevoke(row.original)}
              >
                {t("revoke")}
              </Button>
            </div>
          ),
      },
    ],
    [t, tCommon, format, isPending],
  );

  return (
    <div className="space-y-3">
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">{t("addTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground text-pretty">{t("addDescription")}</p>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">{tCommon("name")}</Label>
              <Input
                id="staff-name"
                className="h-8"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">{tCommon("email")}</Label>
              <Input
                id="staff-email"
                className="h-8"
                type="email"
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">{t("password")}</Label>
              <div className="flex gap-1.5">
                <Input
                  id="staff-password"
                  className="h-8"
                  dir="ltr"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => setPassword(generateSecurePassword())}
                >
                  {t("generate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">{t("role")}</Label>
              <Select value={role} onValueChange={(next) => setRole(next as "owner" | "staff")}>
                <SelectTrigger id="staff-role" className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{t("roleOptions.staff")}</SelectItem>
                  <SelectItem value="owner">{t("roleOptions.owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button size="sm" disabled={isPending} onClick={handleCreate}>
            {t("createAccount")}
          </Button>

          {lastCreated && (
            <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">
                {t("createdNotice", { email: lastCreated.email })}
              </p>
              <div className="flex items-center gap-2">
                <code
                  dir="ltr"
                  className="min-w-0 flex-1 overflow-x-auto rounded border bg-background px-2 py-1 text-xs"
                >
                  {lastCreated.password}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t("copyPassword")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(lastCreated.password);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={admins}
        searchColumnId="member"
        searchPlaceholder={t("searchPlaceholder")}
        columnLabels={{
          member: t("columns.member"),
          role: t("role"),
          added: t("columns.added"),
        }}
        facets={[
          {
            columnId: "role",
            title: t("role"),
            options: [
              { value: "owner", label: t("roles.owner") },
              { value: "staff", label: t("roles.staff") },
            ],
          },
        ]}
        emptyState={
          <EmptyState
            icon={UsersIcon}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        }
      />

      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(open) => !open && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roleDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole?.role === "owner"
                ? t("roleDialog.toStaff", { name: pendingRole?.name ?? "" })
                : t("roleDialog.toOwner", { name: pendingRole?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = pendingRole;
                if (!target) return;
                setPendingRole(null);
                run(
                  () => updateAdminRole(target.id, target.role === "owner" ? "staff" : "owner"),
                  t("toasts.roleUpdated"),
                );
              }}
            >
              {t("roleDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingRevoke !== null}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeDialog.description", { name: pendingRevoke?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = pendingRevoke;
                if (!target) return;
                setPendingRevoke(null);
                run(() => revokeAdminAccess(target.id), t("toasts.accessRevoked"));
              }}
            >
              {t("revokeDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
