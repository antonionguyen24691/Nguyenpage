"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdvisorFund, AdvisorRiskBand } from "@/lib/fundAdvisor";
import type { AdvisorReport } from "@/lib/fundAdvisorReport";

type AdvisorGoal = "growth" | "income" | "balanced";
type LiquidityNeed = "low" | "medium" | "high";
type Profile = {
  riskTolerance: AdvisorRiskBand;
  horizon: number;
  liquidityNeed: LiquidityNeed;
  goal: AdvisorGoal;
  categoryFocus: "all" | "equity" | "bond" | "balanced";
};
type MetricTone = "neutral" | "positive" | "negative";

const defaultProfile: Profile = {
  riskTolerance: "medium",
  horizon: 5,
  liquidityNeed: "medium",
  goal: "balanced",
  categoryFocus: "all",
};

const riskRank: Record<AdvisorRiskBand, number> = { low: 1, medium: 2, high: 3 };

function calculateFitScore(fund: AdvisorFund, profile: Profile) {
  const riskDistance = Math.abs(riskRank[fund.riskBand] - riskRank[profile.riskTolerance]);
  const riskFit = Math.max(0, 10 - riskDistance * 3.2);
  const horizonFit =
    profile.horizon >= 5
      ? fund.riskBand === "high"
        ? 9.5
        : fund.riskBand === "medium"
          ? 8.5
          : 7
      : profile.horizon >= 3
        ? fund.riskBand === "medium"
          ? 9.2
          : 7.8
        : fund.riskBand === "low"
          ? 9.4
          : fund.riskBand === "medium"
            ? 7.2
            : 4.6;
  const liquidityFit =
    profile.liquidityNeed === "high"
      ? fund.riskBand === "low"
        ? 9.4
        : fund.riskBand === "medium"
          ? 7.6
          : 5.5
      : profile.liquidityNeed === "medium"
        ? 8.3
        : fund.riskBand === "high"
          ? 9.2
          : 8;
  const goalFit =
    profile.goal === "growth"
      ? fund.category === "equity"
        ? 9.5
        : fund.category === "balanced"
          ? 7.8
          : 5.8
      : profile.goal === "income"
        ? fund.category === "bond"
          ? 9.4
          : fund.category === "balanced"
            ? 7.9
            : 6.1
        : fund.category === "balanced"
          ? 9.1
          : 8;

  return Number((fund.qualityScore * 0.5 + riskFit * 0.2 + horizonFit * 0.12 + liquidityFit * 0.08 + goalFit * 0.1).toFixed(1));
}

const formatPercent = (value: number | null, signed = true) =>
  value === null || Number.isNaN(value) ? "Không có" : `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const formatNumber = (value: number | null, digits = 1) => (value === null || Number.isNaN(value) ? "Không có" : value.toFixed(digits));
const formatNav = (value: number | null) => (value === null || Number.isNaN(value) ? "Không có" : value.toLocaleString("vi-VN"));
const formatRisk = (value: AdvisorRiskBand) => (value === "low" ? "Thận trọng" : value === "medium" ? "Cân bằng" : "Tăng trưởng");
const formatCategory = (value: Profile["categoryFocus"] | AdvisorFund["category"]) =>
  value === "bond" ? "Quỹ trái phiếu" : value === "balanced" ? "Quỹ cân bằng" : value === "equity" ? "Quỹ cổ phiếu" : "Tất cả";
const buildPersona = (profile: Profile) =>
  profile.riskTolerance === "high" && profile.horizon >= 5
    ? "Nhà đầu tư tăng trưởng dài hạn"
    : profile.riskTolerance === "low" || profile.goal === "income"
      ? "Nhà đầu tư ưu tiên ổn định"
      : "Nhà đầu tư cân bằng";
const buildMarketState = (funds: AdvisorFund[]) =>
  !funds.length
    ? "Chưa đủ dữ liệu"
    : funds.reduce((sum, fund) => sum + (fund.quarterlyChange ?? 0), 0) / funds.length > 4
      ? "Động lượng tích cực"
      : funds.reduce((sum, fund) => sum + (fund.quarterlyChange ?? 0), 0) / funds.length < 0
        ? "Thị trường phòng thủ"
        : "Đi ngang, phân hóa";
const metricTone = (value: number | null, mode: "higher" | "lower"): MetricTone =>
  value === null || Number.isNaN(value) ? "neutral" : mode === "higher" ? (value >= 0 ? "positive" : "negative") : value <= 12 ? "positive" : value >= 20 ? "negative" : "neutral";
const qualityLabel = (score: number) => (score >= 8.5 ? "Nổi bật" : score >= 7.5 ? "Tốt" : score >= 6.5 ? "Đang theo dõi" : "Cần chọn lọc");

function buildRationale(fund: AdvisorFund, profile: Profile) {
  const items: string[] = [];
  if (profile.goal === "growth" && fund.category === "equity") items.push("Phù hợp với mục tiêu tăng trưởng vốn.");
  if (profile.goal === "income" && fund.category === "bond") items.push("Phù hợp với nhu cầu ưu tiên thu nhập và ổn định.");
  if (profile.goal === "balanced" && fund.category === "balanced") items.push("Cân bằng giữa tăng trưởng và phòng thủ.");
  if (profile.horizon >= 5 && (fund.quarterlyChange ?? 0) > 0) items.push("Động lượng trung hạn đang ủng hộ chiến lược nắm giữ.");
  if ((fund.hhi ?? 1) < 0.12) items.push("Danh mục không quá tập trung vào một vài vị thế.");
  return items.slice(0, 3);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold text-on-surface">{label}</div>
      {children}
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-outline-variant/70 bg-white px-3 py-1 text-xs font-semibold text-on-surface-variant">{children}</span>;
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</div>
      <div className="mt-2 font-headline text-2xl font-extrabold text-on-surface">{value}</div>
      <div className="mt-2 text-sm leading-6 text-on-surface-variant">{detail}</div>
    </div>
  );
}

function ScoreTile({ label, value, tone = "neutral" }: { label: string; value: string; tone?: MetricTone }) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "negative"
        ? "border-rose-200 bg-rose-50 text-rose-950"
        : "border-outline-variant/50 bg-white text-on-surface";
  return (
    <div className={`rounded-[1.3rem] border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-2 text-lg font-extrabold">{value}</div>
    </div>
  );
}

function ReportList({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  const cls = warning ? "border-amber-200 bg-amber-50 text-amber-950" : "border-outline-variant/50 bg-surface-container-low text-on-surface";
  return (
    <div className={`rounded-[1.6rem] border p-4 ${cls}`}>
      <div className="text-sm font-bold uppercase tracking-[0.16em]">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-7">{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>Chưa có nhận định.</li>}</ul>
    </div>
  );
}

function AllocationCard({ title, items }: { title: string; items: Array<{ label: string; share: number }> }) {
  return (
    <div className="rounded-[1.6rem] border border-outline-variant/50 bg-surface-container-low p-4">
      <div className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{title}</div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-on-surface">{item.label}</span>
              <span className="text-on-surface-variant">{item.share.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${Math.min(item.share, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparklineChart({ data, benchmarkLabel }: { data: Array<{ time: string; value: number }>; benchmarkLabel: string | null }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant">
        Chưa đủ dữ liệu để hiển thị biểu đồ.
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padding = 20;
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = data
    .map((point, index) => `${padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2)},${height - padding - ((point.value - min) / span) * (height - padding * 2)}`)
    .join(" ");
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <div className="rounded-[1.6rem] border border-outline-variant/50 bg-[linear-gradient(180deg,rgba(12,122,105,0.08),rgba(31,77,183,0.03))] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Diễn biến NAV</div>
          <div className="mt-1 text-sm text-on-surface-variant">Dữ liệu gồm {data.length} mốc {benchmarkLabel ? `, có đối chiếu với ${benchmarkLabel}` : ""}</div>
        </div>
        <div className="rounded-full border border-outline-variant/60 bg-white px-3 py-1.5 text-xs font-semibold text-on-surface-variant">{data[0]?.time} -&gt; {data[data.length - 1]?.time}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full overflow-hidden rounded-[1.25rem] bg-white/70">
        <defs>
          <linearGradient id="advisorArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(12,122,105,0.35)" />
            <stop offset="100%" stopColor="rgba(12,122,105,0.03)" />
          </linearGradient>
        </defs>
        <polyline fill="url(#advisorArea)" stroke="none" points={areaPoints} />
        <polyline fill="none" stroke="#0c7a69" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-on-surface-variant">
        <span>Thấp nhất {formatNav(min)}</span>
        <span>Cao nhất {formatNav(max)}</span>
      </div>
    </div>
  );
}

function RecommendationCard({ fund, fitScore, profile, index, active, onSelect }: { fund: AdvisorFund; fitScore: number; profile: Profile; index: number; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-[1.5rem] border p-4 text-left transition ${active ? "border-primary/40 bg-[linear-gradient(180deg,rgba(12,122,105,0.09),rgba(31,77,183,0.05))]" : "border-outline-variant/50 bg-surface-container-low hover:border-primary/30 hover:bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">#{index + 1} · {fund.company}</div>
          <div className="mt-2 text-lg font-extrabold text-on-surface">{fund.code}</div>
          <div className="mt-1 text-sm text-on-surface-variant">{fund.name}</div>
        </div>
        <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Độ phù hợp</div>
          <div className="text-xl font-extrabold text-primary">{fitScore.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Badge>{formatCategory(fund.category)}</Badge>
        <Badge>{formatRisk(fund.riskBand)}</Badge>
        <Badge>Chất lượng {fund.qualityScore.toFixed(1)}</Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ScoreTile label="1M" value={formatPercent(fund.monthlyChange)} tone={metricTone(fund.monthlyChange, "higher")} />
        <ScoreTile label="1Q" value={formatPercent(fund.quarterlyChange)} tone={metricTone(fund.quarterlyChange, "higher")} />
        <ScoreTile label="Max DD" value={formatPercent(fund.maxDrawdown, false)} tone={metricTone(fund.maxDrawdown, "lower")} />
      </div>
      <div className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">{buildRationale(fund, profile).map((item) => <div key={item}>{item}</div>)}</div>
    </button>
  );
}

function HoldingsTrendTable({ report }: { report: AdvisorReport }) {
  if (!report.holdingsView.topTrends.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
        Chưa đủ dữ liệu để phân tích xu hướng giá của các cổ phiếu trong danh mục.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-outline-variant/50">
      <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr] gap-3 border-b border-outline-variant/30 bg-surface-container-low px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant">
        <span>Mã tài sản</span>
        <span>Tỷ trọng</span>
        <span>Thay đổi</span>
        <span>Biến động 1 tháng</span>
      </div>
      {report.holdingsView.topTrends.map((item) => (
        <div key={item.code} className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr] gap-3 border-b border-outline-variant/20 px-4 py-3 text-sm last:border-b-0">
          <div className="font-semibold text-on-surface">{item.code}</div>
          <div className="text-on-surface-variant">{item.weight.toFixed(2)}%</div>
          <div className={item.changeVsPrevious !== null && item.changeVsPrevious >= 0 ? "text-primary" : "text-on-surface-variant"}>
            {item.changeVsPrevious === null ? "Không có" : `${item.changeVsPrevious >= 0 ? "+" : ""}${item.changeVsPrevious.toFixed(2)}%`}
          </div>
          <div className={item.stance === "positive" ? "text-primary" : item.stance === "cautious" ? "text-[var(--color-error)]" : "text-on-surface-variant"}>{formatPercent(item.monthChangePercent)}</div>
        </div>
      ))}
    </div>
  );
}

export default function FundAdvisorWorkspace({ funds }: { funds: AdvisorFund[] }) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [report, setReport] = useState<AdvisorReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const companies = useMemo(() => ["all", ...new Set(funds.map((fund) => fund.company))], [funds]);
  const visibleFunds = useMemo(() => funds.filter((fund) => (companyFilter === "all" || fund.company === companyFilter) && (profile.categoryFocus === "all" || fund.category === profile.categoryFocus)), [companyFilter, funds, profile.categoryFocus]);
  const recommendations = useMemo(() => visibleFunds.map((fund) => ({ fund, fitScore: calculateFitScore(fund, profile) })).sort((left, right) => right.fitScore - left.fitScore).slice(0, 3), [profile, visibleFunds]);
  const highlightedFund = useMemo(() => visibleFunds.find((fund) => fund.code === selectedCode) ?? recommendations[0]?.fund ?? visibleFunds[0] ?? null, [recommendations, selectedCode, visibleFunds]);
  const highlightedFit = recommendations.find(({ fund }) => fund.code === highlightedFund?.code)?.fitScore ?? (highlightedFund ? calculateFitScore(highlightedFund, profile) : null);
  const highlightedCode = highlightedFund?.code ?? null;

  useEffect(() => {
    if (!highlightedCode) {
      setReport(null);
      return;
    }
    let active = true;
    setReportLoading(true);
    fetch(`/api/advisor-report?fund=${encodeURIComponent(highlightedCode)}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setReport(payload.success ? payload.data : null);
      })
      .catch(() => {
        if (active) setReport(null);
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });
    return () => {
      active = false;
    };
  }, [highlightedCode]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-3 pb-12 pt-6 md:gap-8 md:px-6 md:pb-14 md:pt-8 xl:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(243,247,255,0.82))] p-5 shadow-[0_24px_60px_rgba(16,32,51,0.08)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <span className="section-kicker">Tư vấn chọn quỹ</span>
            <h1 className="max-w-4xl text-[2.2rem] font-extrabold leading-[0.94] tracking-[-0.04em] text-on-surface sm:text-[3rem] lg:text-[4.2rem]">Gợi ý quỹ phù hợp dựa trên mục tiêu đầu tư và dữ liệu vận động thực tế.</h1>
            <p className="max-w-3xl text-base leading-8 text-on-surface-variant">Bạn chọn nhu cầu của mình, hệ thống sẽ sắp xếp các quỹ phù hợp và diễn giải bằng hiệu suất, mức biến động, cơ cấu danh mục và xu hướng của các tài sản đang nắm giữ.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Chân dung nhà đầu tư" value={buildPersona(profile)} detail={`${formatRisk(profile.riskTolerance)} · ${profile.horizon} năm`} />
            <StatCard label="Bối cảnh thị trường" value={buildMarketState(visibleFunds)} detail="Tổng hợp từ diễn biến gần đây của nhóm quỹ đang lọc" />
            <StatCard label="Quỹ phù hợp nhất" value={recommendations[0]?.fund.code ?? "Không có"} detail={recommendations[0] ? `Mức độ phù hợp ${recommendations[0].fitScore.toFixed(1)}/10` : "Chưa có gợi ý"} />
            <StatCard label="Số quỹ được chấm" value={String(visibleFunds.length)} detail={`${companyFilter === "all" ? "Tất cả công ty" : companyFilter} · ${formatCategory(profile.categoryFocus)}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Hồ sơ tư vấn</p><h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Chọn khẩu vị đầu tư</h2></div>
            <div className="space-y-4">
              <Field label="Khẩu vị rủi ro"><select value={profile.riskTolerance} onChange={(event) => setProfile((current) => ({ ...current, riskTolerance: event.target.value as AdvisorRiskBand }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"><option value="low">Thận trọng</option><option value="medium">Cân bằng</option><option value="high">Tăng trưởng</option></select></Field>
              <Field label="Thời gian đầu tư"><input type="range" min={1} max={10} value={profile.horizon} onChange={(event) => setProfile((current) => ({ ...current, horizon: Number(event.target.value) }))} className="w-full" /><div className="mt-2 text-sm font-semibold text-on-surface">{profile.horizon} năm</div></Field>
              <Field label="Nhu cầu thanh khoản"><select value={profile.liquidityNeed} onChange={(event) => setProfile((current) => ({ ...current, liquidityNeed: event.target.value as LiquidityNeed }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"><option value="low">Có thể giữ lâu</option><option value="medium">Cân bằng</option><option value="high">Cần rút linh hoạt</option></select></Field>
              <Field label="Mục tiêu ưu tiên"><select value={profile.goal} onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value as AdvisorGoal }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"><option value="growth">Tăng trưởng</option><option value="income">Ổn định / thu nhập</option><option value="balanced">Cân bằng</option></select></Field>
              <Field label="Loại quỹ ưu tiên"><select value={profile.categoryFocus} onChange={(event) => setProfile((current) => ({ ...current, categoryFocus: event.target.value as Profile["categoryFocus"] }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none"><option value="all">Tất cả</option><option value="equity">Quỹ cổ phiếu</option><option value="balanced">Quỹ cân bằng</option><option value="bond">Quỹ trái phiếu</option></select></Field>
              <Field label="Công ty quản lý"><select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">{companies.map((company) => <option key={company} value={company}>{company === "all" ? "Tất cả công ty" : company}</option>)}</select></Field>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Danh sách gợi ý</p>
            <div className="mt-4 space-y-3">{recommendations.map(({ fund, fitScore }, index) => <RecommendationCard key={fund.code} fund={fund} fitScore={fitScore} profile={profile} index={index} active={fund.code === highlightedFund?.code} onSelect={() => setSelectedCode(fund.code)} />)}</div>
          </section>
        </aside>

        <section className="space-y-6">
          {highlightedFund ? <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3"><div className="section-kicker">Phân tích quỹ</div><div><h2 className="font-headline text-3xl font-extrabold text-on-surface">{highlightedFund.name}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">{highlightedFund.summary}</p></div><div className="flex flex-wrap gap-2"><Badge>{highlightedFund.company}</Badge><Badge>{formatCategory(highlightedFund.category)}</Badge><Badge>{formatRisk(highlightedFund.riskBand)}</Badge><Badge>{qualityLabel(highlightedFund.qualityScore)}</Badge>{highlightedFund.benchmark ? <Badge>{highlightedFund.benchmark}</Badge> : null}</div></div>
              <div className="grid min-w-[280px] grid-cols-2 gap-3"><ScoreTile label="Độ phù hợp" value={highlightedFit !== null ? highlightedFit.toFixed(1) : "Không có"} tone="positive" /><ScoreTile label="Điểm chất lượng" value={highlightedFund.qualityScore.toFixed(1)} tone="positive" /><ScoreTile label="NAV gần nhất" value={formatNav(highlightedFund.latestNav)} /><ScoreTile label="Số mốc dữ liệu" value={String(highlightedFund.pointCount)} /></div>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]"><SparklineChart data={highlightedFund.chartSeries} benchmarkLabel={highlightedFund.benchmark} /><div className="space-y-3"><ScoreTile label="Tăng giảm 1 tháng" value={formatPercent(highlightedFund.monthlyChange)} tone={metricTone(highlightedFund.monthlyChange, "higher")} /><ScoreTile label="Tăng giảm 1 quý" value={formatPercent(highlightedFund.quarterlyChange)} tone={metricTone(highlightedFund.quarterlyChange, "higher")} /><ScoreTile label="Từ đầu kỳ dữ liệu" value={formatPercent(highlightedFund.sinceInceptionChange)} tone={metricTone(highlightedFund.sinceInceptionChange, "higher")} /><ScoreTile label="Độ biến động" value={formatPercent(highlightedFund.annualizedVolatility, false)} tone={metricTone(highlightedFund.annualizedVolatility, "lower")} /><ScoreTile label="Sụt giảm tối đa" value={formatPercent(highlightedFund.maxDrawdown, false)} tone={metricTone(highlightedFund.maxDrawdown, "lower")} /><ScoreTile label="Tỷ trọng lớn nhất" value={formatPercent(highlightedFund.topHoldingShare, false)} /></div></div>
            <div className="mt-6 grid gap-4 lg:grid-cols-4"><ScoreTile label="Động lực" value={formatNumber(highlightedFund.scores.momentum)} /><ScoreTile label="Độ bền" value={formatNumber(highlightedFund.scores.resilience)} /><ScoreTile label="Đa dạng hóa" value={formatNumber(highlightedFund.scores.diversification)} /><ScoreTile label="Độ dày dữ liệu" value={formatNumber(highlightedFund.scores.coverage)} /></div>
            {reportLoading ? <div className="mt-6 flex min-h-[240px] items-center justify-center rounded-[1.6rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-semibold text-on-surface-variant">Đang cập nhật nhận định cho quỹ đang chọn...</div> : report ? <div className="mt-6 space-y-6">
              <div className="grid gap-4 xl:grid-cols-3"><ScoreTile label="Thị trường 1 tháng" value={formatPercent(report.benchmark.monthlyChange)} tone={metricTone(report.benchmark.monthlyChange, "higher")} /><ScoreTile label="Thị trường 1 quý" value={formatPercent(report.benchmark.quarterlyChange)} tone={metricTone(report.benchmark.quarterlyChange, "higher")} /><ScoreTile label="Nhịp thị trường" value={report.marketRegime.label} tone={report.marketRegime.tone === "positive" ? "positive" : report.marketRegime.tone === "cautious" ? "negative" : "neutral"} /></div>
              <div className="grid gap-4 xl:grid-cols-2"><ReportList title="Góc nhìn thị trường" items={[report.marketRegime.explanation, report.macroView.cycleCall]} /><ReportList title="Kết luận" items={[report.conclusion.summary, ...report.conclusion.recommendation]} /></div>
              <div className="grid gap-4 xl:grid-cols-2"><ReportList title="Yếu tố hỗ trợ" items={report.macroView.tailwinds} /><ReportList title="Yếu tố cần lưu ý" items={report.macroView.headwinds} warning /></div>
              <div className="grid gap-4 xl:grid-cols-2"><AllocationCard title="Cơ cấu tài sản hiện tại" items={report.holdingsView.assetMix} /><ReportList title="Diễn biến danh mục" items={report.holdingsView.explanation} /></div>
              <div className="grid gap-4 xl:grid-cols-4"><ScoreTile label="Ngày dữ liệu mới nhất" value={report.fundHealth.latestNavDate ?? "Không có"} /><ScoreTile label="Độ tập trung HHI" value={formatNumber(report.fundHealth.hhi, 3)} /><ScoreTile label="Tỷ trọng đang tăng giá" value={formatPercent(report.holdingsView.positiveTrendWeight)} tone={metricTone(report.holdingsView.positiveTrendWeight, "higher")} /><ScoreTile label="Tỷ trọng được nâng thêm" value={formatPercent(report.holdingsView.increasedWeightShare)} tone={metricTone(report.holdingsView.increasedWeightShare, "higher")} /></div>
              <div><div className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-primary">Diễn biến các mã đang nắm giữ</div><HoldingsTrendTable report={report} /></div>
            </div> : <div className="mt-6 rounded-[1.6rem] border border-dashed border-outline-variant/70 bg-surface-container-low px-5 py-6 text-sm text-on-surface-variant">Chưa tải được dữ liệu phân tích cho quỹ này.</div>}
            <div className="mt-6 grid gap-4 xl:grid-cols-2"><ReportList title="Điểm phù hợp với nhu cầu của bạn" items={buildRationale(highlightedFund, profile)} /><ReportList title="Những điểm cần theo dõi" items={highlightedFund.cautions} warning /></div>
            <div className="mt-6 grid gap-4 xl:grid-cols-2"><AllocationCard title="Phân bổ tài sản" items={highlightedFund.assetAllocation.slice(0, 6)} /><AllocationCard title="Phân bổ theo ngành" items={highlightedFund.sectorAllocation.slice(0, 6)} /></div>
          </section> : null}

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Toàn bộ quỹ đang theo dõi</p><h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Danh sách quỹ theo thứ tự ưu tiên hiện tại</h3></div><div className="rounded-full border border-outline-variant/70 bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant">{visibleFunds.length} quỹ đang hiển thị</div></div>
            <div className="grid gap-4">{visibleFunds.map((fund) => { const fitScore = calculateFitScore(fund, profile); return <button key={fund.code} type="button" onClick={() => setSelectedCode(fund.code)} className="rounded-[1.5rem] border border-outline-variant/50 bg-surface-container-low p-4 text-left transition hover:border-primary/30 hover:bg-white"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-extrabold text-on-surface">{fund.code}</span><Badge>{fund.company}</Badge><Badge>{formatCategory(fund.category)}</Badge><Badge>{formatRisk(fund.riskBand)}</Badge></div><div className="mt-2 text-base font-semibold text-on-surface">{fund.name}</div><div className="mt-2 text-sm leading-7 text-on-surface-variant">{fund.summary}</div></div><div className="grid min-w-[260px] grid-cols-2 gap-3"><ScoreTile label="Độ phù hợp" value={fitScore.toFixed(1)} /><ScoreTile label="Điểm chất lượng" value={fund.qualityScore.toFixed(1)} /><ScoreTile label="Tăng giảm 1 quý" value={formatPercent(fund.quarterlyChange)} tone={metricTone(fund.quarterlyChange, "higher")} /><ScoreTile label="Độ biến động" value={formatPercent(fund.annualizedVolatility, false)} tone={metricTone(fund.annualizedVolatility, "lower")} /></div></div></button>; })}</div>
          </section>
        </section>
      </div>
    </div>
  );
}
