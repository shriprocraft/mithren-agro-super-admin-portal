"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatINR, formatNumber } from "@/lib/format";

interface Point {
  day: string;
  orders: number;
  valuePaise: number;
}

type Measure = "orders" | "value";

/** Groups daily points into weekly buckets for long ranges so bars stay legible. */
function bucket(points: Point[]): (Point & { label: string })[] {
  if (points.length <= 31) return points.map((p) => ({ ...p, label: formatDate(p.day).slice(0, 6) }));
  const out: (Point & { label: string })[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const slice = points.slice(i, i + 7);
    const first = slice[0] as Point;
    out.push({
      day: first.day,
      label: `w/c ${formatDate(first.day).slice(0, 6)}`,
      orders: slice.reduce((s, p) => s + p.orders, 0),
      valuePaise: slice.reduce((s, p) => s + p.valuePaise, 0),
    });
  }
  return out;
}

/**
 * Single-series bar chart (orders placed, or summed order totals) with one y-axis. The measure is
 * switched rather than drawn on a second axis. A table view gives the same numbers without the chart.
 */
export function OrderTrendChart({ points }: { points: Point[] }) {
  const [measure, setMeasure] = React.useState<Measure>("orders");
  const data = React.useMemo(() => bucket(points), [points]);
  const weekly = points.length > 31;
  const value = (p: Point) => (measure === "orders" ? p.orders : p.valuePaise / 100);
  const fmt = (n: number) => (measure === "orders" ? formatNumber(n) : formatINR(n * 100));
  const id = React.useId();

  return (
    <div>
      <div role="radiogroup" aria-label="Chart measure" className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
        {(["orders", "value"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={measure === m}
            onClick={() => setMeasure(m)}
            className={`h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${measure === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}
          >
            {m === "orders" ? "Orders placed" : "Sum of order totals"}
          </button>
        ))}
      </div>
      <figure aria-labelledby={`${id}-cap`}>
        <div className="h-64 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={weekly ? "22%" : "18%"}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={measure === "orders" ? 32 : 64} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(n: number) => (measure === "orders" ? String(n) : `₹${formatNumber(n)}`)} />
              <Tooltip
                cursor={{ fill: "var(--soft)" }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload as (Point & { label: string }) | undefined;
                  if (!p) return null;
                  return (
                    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-overlay">
                      <p className="font-medium text-foreground">{weekly ? `Week of ${formatDate(p.day)}` : formatDate(p.day)}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {measure === "orders" ? "Orders placed" : "Sum of order totals"}: <span className="font-semibold text-foreground">{fmt(value(p))}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey={(p: Point) => value(p)} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption id={`${id}-cap`} className="mt-2 text-xs text-muted-foreground">
          {measure === "orders" ? "Orders placed" : "Sum of parent order totals (not GMV — see Needs clarification)"} per {weekly ? "week" : "day"}, IST. Demo data.
        </figcaption>
      </figure>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer rounded-md font-medium text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Show as table</summary>
        <div className="scrollbar-thin mt-2 max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Order trend data</caption>
            <thead className="sticky top-0 bg-secondary">
              <tr>
                <th scope="col" className="px-3 py-2 text-xs font-semibold text-muted-foreground">{weekly ? "Week of" : "Day"}</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Orders</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Sum of order totals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p) => (
                <tr key={p.day}>
                  <td className="px-3 py-1.5">{formatDate(p.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatINR(p.valuePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
