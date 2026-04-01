"use client";

import { useMemo, useState } from "react";
import type { AdvisorFund, AdvisorRiskBand } from "@/lib/fundAdvisor";

type AdvisorGoal = "growth" | "income" | "balanced";
type LiquidityNeed = "low" | "medium" | "high";

type Profile = {
  riskTolerance: AdvisorRiskBand;
  horizon: number;
  liquidityNeed: LiquidityNeed;
  goal: AdvisorGoal;
  categoryFocus: "all" | "equity" | "bond" | "balanced";
};

const defaultProfile: Profile = {
  riskTolerance: "medium",
  horizon: 5,
  liquidityNeed: "medium",
  goal: "balanced",
  categoryFocus: "all",
};

const riskRank: Record<AdvisorRiskBand, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

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

function formatPercent(value: number | null, signed = true) {
  if (value === null || Number.isNaN(value)) return "N/A";
  const prefix = signed && value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatRisk(value: AdvisorRiskBand) {
  if (value === "low") return "Than trong";
  if (value === "medium") return "Can bang";
  return "Tang truong";
}

function formatGoal(value: AdvisorGoal) {
  if (value === "growth") return "Tang truong";
  if (value === "income") return "Thu nhap";
  return "Can bang";
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

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-outline-variant/50 bg-white px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</div>
      <div className="mt-2 text-lg font-extrabold text-on-surface">{value}</div>
    </div>
  );
}

function MetricPanel({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[1.4rem] border border-outline-variant/50 bg-surface-container-low p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</div>
      <div className="mt-2 font-headline text-2xl font-extrabold text-on-surface">{value.toFixed(1)}</div>
      <div className="mt-2 text-sm leading-6 text-on-surface-variant">{detail}</div>
    </div>
  );
}

function NarrativeCard({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "warning" }) {
  const toneClass = tone === "positive" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={`rounded-[1.6rem] border p-4 ${toneClass}`}>
      <div className="text-sm font-bold uppercase tracking-[0.16em]">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-7">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>Chua co nhan dinh bo sung.</li>}
      </ul>
    </div>
  );
}

function NarrativeInline({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.25rem] border border-outline-variant/50 bg-white px-4 py-4">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{title}</div>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-on-surface">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>Chua co ghi chu.</li>}
      </ul>
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

export default function FundAdvisorWorkspace({ funds }: { funds: AdvisorFund[] }) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const companies = useMemo(() => ["all", ...new Set(funds.map((fund) => fund.company))], [funds]);

  const visibleFunds = useMemo(
    () =>
      funds.filter((fund) => {
        const matchesCompany = companyFilter === "all" || fund.company === companyFilter;
        const matchesCategory = profile.categoryFocus === "all" || fund.category === profile.categoryFocus;
        return matchesCompany && matchesCategory;
      }),
    [companyFilter, funds, profile.categoryFocus],
  );

  const recommendations = useMemo(
    () =>
      visibleFunds
        .map((fund) => ({ fund, fitScore: calculateFitScore(fund, profile) }))
        .sort((left, right) => right.fitScore - left.fitScore)
        .slice(0, 3),
    [profile, visibleFunds],
  );

  const highlightedFund = recommendations[0]?.fund ?? visibleFunds[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-3 pb-12 pt-6 md:gap-8 md:px-6 md:pb-14 md:pt-8 xl:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(243,247,255,0.82))] p-5 shadow-[0_24px_60px_rgba(16,32,51,0.08)] md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <span className="section-kicker">Fund advisor</span>
            <div>
              <h1 className="max-w-4xl text-[2.2rem] font-extrabold leading-[0.94] tracking-[-0.04em] text-on-surface sm:text-[3rem] lg:text-[4.2rem]">
                Tim quy chat luong tu toan bo du lieu NAV, danh muc va do phu du lieu dang co.
              </h1>
            </div>
            <p className="max-w-3xl text-base leading-8 text-on-surface-variant">
              Module nay dung chung dataset quy hien co trong banker-system, khong dung mock. Diem quality va de xuat duoc tinh tu dong tu NAV, holdings, benchmark va do moi cua du lieu.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="So quy dang phan tich" value={String(funds.length)} detail="Lay truc tiep tu fund dataset" />
            <StatCard label="Top quality" value={funds[0] ? `${funds[0].code} · ${funds[0].qualityScore.toFixed(1)}` : "N/A"} detail={funds[0]?.company ?? "Chua co du lieu"} />
            <StatCard label="Khuyen nghi phu hop nhat" value={recommendations[0] ? recommendations[0].fund.code : "N/A"} detail={recommendations[0] ? `Fit ${recommendations[0].fitScore.toFixed(1)}/10` : "Chua co goi y"} />
            <StatCard label="Muc tieu hien tai" value={formatGoal(profile.goal)} detail={`${formatRisk(profile.riskTolerance)} · ${profile.horizon} nam`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Ho so tu van</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Chon khau vi dau tu</h2>
            </div>
            <div className="space-y-4">
              <Field label="Khau vi rui ro">
                <select value={profile.riskTolerance} onChange={(event) => setProfile((current) => ({ ...current, riskTolerance: event.target.value as AdvisorRiskBand }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">
                  <option value="low">Than trong</option>
                  <option value="medium">Can bang</option>
                  <option value="high">Tang truong</option>
                </select>
              </Field>
              <Field label="Thoi gian dau tu">
                <input type="range" min={1} max={10} value={profile.horizon} onChange={(event) => setProfile((current) => ({ ...current, horizon: Number(event.target.value) }))} className="w-full" />
                <div className="mt-2 text-sm font-semibold text-on-surface">{profile.horizon} nam</div>
              </Field>
              <Field label="Nhu cau thanh khoan">
                <select value={profile.liquidityNeed} onChange={(event) => setProfile((current) => ({ ...current, liquidityNeed: event.target.value as LiquidityNeed }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">
                  <option value="low">Co the giu lau</option>
                  <option value="medium">Can bang</option>
                  <option value="high">Can rut linh hoat</option>
                </select>
              </Field>
              <Field label="Muc tieu uu tien">
                <select value={profile.goal} onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value as AdvisorGoal }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">
                  <option value="growth">Tang truong</option>
                  <option value="income">On dinh / thu nhap</option>
                  <option value="balanced">Can bang</option>
                </select>
              </Field>
              <Field label="Loai quy uu tien">
                <select value={profile.categoryFocus} onChange={(event) => setProfile((current) => ({ ...current, categoryFocus: event.target.value as Profile["categoryFocus"] }))} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">
                  <option value="all">Tat ca</option>
                  <option value="equity">Equity</option>
                  <option value="balanced">Balanced</option>
                  <option value="bond">Bond</option>
                </select>
              </Field>
              <Field label="Cong ty quan ly">
                <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-sm font-semibold text-on-surface outline-none">
                  {companies.map((company) => (
                    <option key={company} value={company}>
                      {company === "all" ? "Tat ca cong ty" : company}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Top de xuat</p>
            <div className="mt-4 space-y-3">
              {recommendations.map(({ fund, fitScore }, index) => (
                <div key={fund.code} className="rounded-[1.4rem] border border-outline-variant/50 bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">#{index + 1} · {fund.company}</div>
                      <div className="mt-2 text-lg font-extrabold text-on-surface">{fund.code}</div>
                      <div className="mt-1 text-sm text-on-surface-variant">{fund.name}</div>
                    </div>
                    <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Fit</div>
                      <div className="text-xl font-extrabold text-primary">{fitScore.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge>{fund.category}</Badge>
                    <Badge>{formatRisk(fund.riskBand)}</Badge>
                    <Badge>Quality {fund.qualityScore.toFixed(1)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          {highlightedFund ? (
            <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="section-kicker">Best match hien tai</div>
                  <div>
                    <h2 className="font-headline text-3xl font-extrabold text-on-surface">{highlightedFund.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">{highlightedFund.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{highlightedFund.company}</Badge>
                    <Badge>{highlightedFund.category}</Badge>
                    <Badge>{formatRisk(highlightedFund.riskBand)}</Badge>
                    {highlightedFund.benchmark ? <Badge>{highlightedFund.benchmark}</Badge> : null}
                  </div>
                </div>
                <div className="grid min-w-[280px] grid-cols-2 gap-3">
                  <ScoreTile label="Quality" value={highlightedFund.qualityScore.toFixed(1)} />
                  <ScoreTile label="1M" value={formatPercent(highlightedFund.monthlyChange)} />
                  <ScoreTile label="1Q" value={formatPercent(highlightedFund.quarterlyChange)} />
                  <ScoreTile label="Max DD" value={formatPercent(highlightedFund.maxDrawdown, false)} />
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-4">
                <MetricPanel label="Momentum" value={highlightedFund.scores.momentum} detail="Dong luc NAV gan day" />
                <MetricPanel label="Resilience" value={highlightedFund.scores.resilience} detail="Chiu rung lac va drawdown" />
                <MetricPanel label="Diversification" value={highlightedFund.scores.diversification} detail="Do tap trung danh muc" />
                <MetricPanel label="Coverage" value={highlightedFund.scores.coverage} detail="Do day va do moi du lieu" />
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <NarrativeCard title="Ly do noi bat" tone="positive" items={highlightedFund.strengths} />
                <NarrativeCard title="Can theo doi" tone="warning" items={highlightedFund.cautions} />
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <AllocationCard title="Asset allocation" items={highlightedFund.assetAllocation.slice(0, 6)} />
                <AllocationCard title="Sector allocation" items={highlightedFund.sectorAllocation.slice(0, 6)} />
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_20px_46px_rgba(16,32,51,0.06)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Quality explorer</p>
                <h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">Tat ca quy duoc xep hang theo quality score</h3>
              </div>
              <div className="rounded-full border border-outline-variant/70 bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant">{visibleFunds.length} quy dang hien thi</div>
            </div>
            <div className="grid gap-4">
              {visibleFunds.map((fund) => {
                const fitScore = calculateFitScore(fund, profile);
                return (
                  <div key={fund.code} className="rounded-[1.5rem] border border-outline-variant/50 bg-surface-container-low p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-extrabold text-on-surface">{fund.code}</span>
                          <Badge>{fund.company}</Badge>
                          <Badge>{fund.category}</Badge>
                          <Badge>{formatRisk(fund.riskBand)}</Badge>
                        </div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{fund.name}</div>
                        <div className="mt-2 text-sm leading-7 text-on-surface-variant">{fund.summary}</div>
                      </div>
                      <div className="grid min-w-[240px] grid-cols-2 gap-3">
                        <ScoreTile label="Fit" value={fitScore.toFixed(1)} />
                        <ScoreTile label="Quality" value={fund.qualityScore.toFixed(1)} />
                        <ScoreTile label="Vol" value={formatPercent(fund.annualizedVolatility, false)} />
                        <ScoreTile label="Top holding" value={formatPercent(fund.topHoldingShare, false)} />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <NarrativeInline title="Diem manh" items={fund.strengths} />
                      <NarrativeInline title="Luu y" items={fund.cautions} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
