"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  ArrowRight,
  CalendarPlus,
  Eye,
  EyeOff,
  FileStack,
  Files,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useRoleStore, useMounted } from "@/hooks/use-role";
import { useDeleteMaterial, useStats } from "@/hooks/use-materials";
import { ROLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ClassificationCategory } from "@/lib/constants";
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
import { StatCard } from "./stat-card";
import { ClassificationBadge } from "./classification-badge";
import { formatDate } from "./format";

const CATEGORY_BAR: Record<ClassificationCategory, string> = {
  문서: "#d97706",
  음영: "#059669",
  기물: "#e11d48",
};

const PIE_COLORS = ["#d97706", "#059669", "#b45309", "#9d174d", "#65a30d"];

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-3 rounded-lg border-stone-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <CardHeader className="px-0">
        <CardTitle className="text-base font-semibold text-stone-800">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-xs text-stone-500">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

export function Dashboard({
  onOpenDetail,
  onOpenEdit,
}: {
  onOpenDetail: (id: string) => void;
  onOpenEdit: (id: string | null) => void;
}) {
  const role = useRoleStore((s) => s.role);
  const mounted = useMounted();
  const roleInfo = ROLES.find((r) => r.value === role);
  const canManage = !!roleInfo?.canManage;
  const delMut = useDeleteMaterial();
  const { data, isLoading, isError, refetch } = useStats(role);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm text-stone-500">
          통계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const publicCount = data?.publicCount ?? 0;
  const privateCount = data?.privateCount ?? 0;
  // 현재 월 카운트 — 클라이언트 마운트 후에만 계산 (hydration mismatch 방지)
  const monthCount = (() => {
    if (!mounted) return 0;
    const key = format(new Date(), "yyyy-MM");
    return (
      data?.byMonth?.find((m) => m.month?.startsWith(key))?.count ?? 0
    );
  })();
  // 이번 달 라벨 — 마운트 전에는 빈 placeholder (SSR/클라이언트 일치)
  const monthLabel = mounted
    ? format(new Date(), "yyyy년 M월", { locale: ko })
    : "";

  const byCategory = data?.byCategory ?? [];
  const byCharacter = data?.byCharacter ?? [];
  const byMonth = (data?.byMonth ?? []).map((m) => ({
    ...m,
    label: (() => {
      try {
        return format(parseISO(`${m.month}-01`), "yy.MM", { locale: ko });
      } catch {
        return m.month;
      }
    })(),
  }));
  const recent = data?.recentMaterials ?? [];

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg border border-stone-200 bg-white" />
          ))
        ) : (
          <>
            <StatCard
              title="전체 자료"
              value={total}
              icon={Files}
              accent="stone"
              hint="누적 등록 건수"
            />
            <StatCard
              title="공개 자료"
              value={publicCount}
              icon={Eye}
              accent="emerald"
              hint="모든 사용자 조회 가능"
            />
            <StatCard
              title="비공개 자료"
              value={privateCount}
              icon={EyeOff}
              accent="rose"
              hint="권한 보유자만 조회"
            />
            <StatCard
              title="이번 달 등록"
              value={monthCount}
              icon={CalendarPlus}
              accent="amber"
              hint={monthLabel || "이번 달"}
            />
          </>
        )}
      </section>

      {/* 차트 영역 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg border border-stone-200 bg-white" />
          ))
        ) : (
          <>
            <ChartCard
              title="자료 분류별 건수"
              description="대분류(문서/음영/기물) 기준"
            >
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byCategory}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 12, fill: "#78716c" }}
                      axisLine={{ stroke: "#e7e5e4" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#fafaf9" }}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e7e5e4",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                      formatter={(v: number) => [`${v}건`, "건수"]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {byCategory.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={CATEGORY_BAR[entry.category as ClassificationCategory] ?? "#a8a29e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="자료 성격별 비율"
              description="일반/예배·설교/교육·회의/세미나·워크샵"
            >
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCharacter}
                      dataKey="count"
                      nameKey="character"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {byCharacter.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e7e5e4",
                      }}
                      formatter={(v: number, n: string) => [`${v}건`, n]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="월별 등록 추이"
              description="최근 12개월 기준"
            >
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={byMonth}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#78716c" }}
                      axisLine={{ stroke: "#e7e5e4" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#78716c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e7e5e4",
                      }}
                      formatter={(v: number) => [`${v}건`, "등록 건수"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#d97706", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </>
        )}
      </section>

      {/* 최근 등록 자료 */}
      <section>
        <Card className="gap-0 overflow-hidden rounded-lg border-stone-200 bg-white p-0 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileStack className="size-4 text-amber-700" />
              <h3 className="text-base font-semibold text-stone-800">
                최근 등록 자료
              </h3>
              <Badge variant="outline" className="ml-1 border-stone-200 bg-stone-50 text-stone-500">
                최신 {Math.min(recent.length, 8)}건
              </Badge>
            </div>
            {canManage ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-stone-500 hover:bg-amber-50 hover:text-amber-700"
                onClick={() => onOpenEdit(null)}
              >
                <ArrowRight className="size-3.5" />
                자료 등록
              </Button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-stone-400">
              등록된 자료가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-stone-200 bg-stone-50/60 hover:bg-stone-50/60">
                  <TableHead className="pl-5 text-stone-500">자료제목</TableHead>
                  <TableHead className="text-stone-500">소관부서</TableHead>
                  <TableHead className="hidden text-stone-500 md:table-cell">기준일자</TableHead>
                  <TableHead className="text-stone-500">분류</TableHead>
                  <TableHead className="text-stone-500">공개</TableHead>
                  {canManage ? (
                    <TableHead className="w-24 pr-5 text-right text-stone-500">관리</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.slice(0, 8).map((m) => (
                  <TableRow
                    key={m.id}
                    onClick={() => onOpenDetail(m.id)}
                    className="cursor-pointer border-stone-100"
                  >
                    <TableCell className="max-w-[280px] pl-5">
                      <span className="line-clamp-1 font-medium text-stone-800">
                        {m.title}
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-600">{m.department}</TableCell>
                    <TableCell className="hidden text-stone-600 md:table-cell">
                      {formatDate(m.referenceDate)}
                    </TableCell>
                    <TableCell>
                      <ClassificationBadge code={m.classification} />
                    </TableCell>
                    <TableCell className="pr-5">
                      <PublicBadge isPublic={m.isPublic} />
                    </TableCell>
                    {canManage ? (
                      <TableCell
                        className="pr-5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DashboardRowActions
                          id={m.id}
                          title={m.title}
                          onEdit={() => onOpenEdit(m.id)}
                          deleting={delMut.isPending && delMut.variables === m.id}
                          onDelete={() =>
                            delMut.mutate(m.id, {
                              onSuccess: () => toast.success("자료가 삭제되었습니다."),
                              onError: (e) => toast.error(e.message || "삭제 실패"),
                            })
                          }
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}

export function PublicBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[11px] font-medium",
        isPublic
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-stone-300 bg-stone-100 text-stone-600"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isPublic ? "bg-emerald-500" : "bg-stone-400"
        )}
      />
      {isPublic ? "공개" : "비공개"}
    </Badge>
  );
}

function DashboardRowActions({
  id: _id,
  title,
  onEdit,
  onDelete,
  deleting,
}: {
  id: string;
  title: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-stone-500 hover:bg-amber-50 hover:text-amber-700"
        onClick={onEdit}
        title="수정"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-stone-500 hover:bg-rose-50 hover:text-rose-600"
        onClick={() => setOpen(true)}
        title="삭제"
        disabled={deleting}
      >
        <Trash2 className="size-3.5" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              자료 「{title}」를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {deleting ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


