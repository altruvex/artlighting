"use client";

import DashboardHeader from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserAvatar from "@/components/user-avatar";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type UserWithShipping = {
  id: string;
  email: string | null;
  createdAt: Date;
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    address: string;
  } | null;
  orders: {
    isCompleted: boolean;
  }[];
};

const UsersClient = ({ users }: { users: UserWithShipping[] }) => {
  const [searchItem, setSearchItem] = useState<string>("");
  const [filteredUsers, setFilteredUsers] = useState<UserWithShipping[]>(users);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("Customers");
  const tCommon = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const format = useFormatter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    setSearchItem(searchValue);
    setLoading(true);
    setError(null);
    try {
      const searchOnNumber = searchValue;
      const filteredItems = users.filter(
        (user: UserWithShipping) =>
          user.shippingAddress?.phoneNumber?.includes(searchOnNumber) ||
          user.shippingAddress?.fullName
            .toLowerCase()
            .includes(searchValue.toLowerCase()) ||
          user.shippingAddress?.address
            .toLowerCase()
            .includes(searchValue.toLowerCase()),
      );
      setFilteredUsers(filteredItems);
    } catch (error) {
      setError(t("filterError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-10">
      <DashboardHeader Route={tNav("customers")}>
        <div className="flex items-center gap-4 md:ms-auto">
          <form className="ms-auto flex-1 sm:flex-initial">
            <div className="relative">
              <SearchIcon className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchItem}
                onChange={handleInputChange}
                type="text"
                placeholder={t("searchPlaceholder")}
                className="ps-8 w-full sm:w-[300px] md:w-[200px] lg:w-[300px]"
              />
            </div>
          </form>
        </div>
      </DashboardHeader>
      <div className="mt-10 px-6">
        <h2 className="text-xl font-semibold mb-4">{t("allCustomers")}</h2>
        <Card className="overflow-hidden glass-surface rounded-2xl">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-lg sm:text-xl">{t("cardTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.id")}</TableHead>
                    <TableHead>{t("columns.name")}</TableHead>
                    <TableHead>{t("columns.phone")}</TableHead>
                    <TableHead>{t("columns.shippingAddress")}</TableHead>
                    <TableHead>{tCommon("email")}</TableHead>
                    <TableHead>{tCommon("date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        {tCommon("loading")}
                      </TableCell>
                    </TableRow>
                  )}
                  {error && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-red-600"
                      >
                        {error}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        {t("empty")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    !error &&
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link href={`/admin/dashboard/users/${user.id}`}>
                            {user.id}
                          </Link>
                        </TableCell>
                        <TableCell className="flex items-center text-nowrap">
                          <UserAvatar email={user.email ?? ""} className="me-1.5" />
                          {user.shippingAddress?.fullName}
                        </TableCell>
                        <TableCell>
                          <span dir="ltr">{user.shippingAddress?.phoneNumber}</span>
                        </TableCell>
                        <TableCell>{user.shippingAddress?.address}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format.dateTime(new Date(user.createdAt), { dateStyle: "medium" })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsersClient;