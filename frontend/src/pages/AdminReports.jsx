import { useEffect, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import toast from "react-hot-toast";
import { reportApi } from "../api/reportApi.js";
import { getApiError } from "../api/axios.js";
import { Card } from "../components/UI.jsx";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
};

const colors = ["#ff0050", "#2563eb", "#10b981", "#f59e0b", "#7c3aed"];

function ReportCard({ title, loading, empty, children }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-copy">{title}</h2>
      {loading ? (
        <div className="flex h-64 items-center justify-center text-xs text-muted">Loading report…</div>
      ) : empty ? (
        <div className="flex h-64 items-center justify-center text-xs text-muted">No report data available yet.</div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </Card>
  );
}

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      reportApi.monthlySales({ year: new Date().getFullYear() }),
      reportApi.stockMovement({}),
      reportApi.topProducts({ limit: 5 }),
    ])
      .then(([sales, movements, products]) => {
        if (active) setReports({ sales, movements, products });
      })
      .catch((error) => {
        if (active) toast.error(getApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const months = reports?.sales.months || [];
  const movements = reports?.movements.movements || [];
  const products = reports?.products.products || [];

  return (
    <section className="mt-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-copy">Business reports</p>
        <p className="mt-1 text-[11px] text-muted">Sales and inventory trends from recorded transactions.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ReportCard title="Monthly completed sales (Rs)" loading={loading} empty={!months.some((item) => item.sales > 0)}>
          <Line
            data={{
              labels: months.map((item) => new Date(reports.sales.year, item.month - 1).toLocaleString("en", { month: "short" })),
              datasets: [{
                label: "Sales",
                data: months.map((item) => item.sales),
                borderColor: colors[0],
                backgroundColor: "rgb(255 0 80 / 12%)",
                fill: true,
                tension: 0.3,
              }],
            }}
            options={chartOptions}
          />
        </ReportCard>
        <ReportCard title="Stock movement (last 30 days)" loading={loading} empty={!movements.length}>
          <Bar
            data={{
              labels: movements.map((item) => item.date),
              datasets: [
                { label: "Stock in", data: movements.map((item) => item.stockIn), backgroundColor: "#10b981" },
                { label: "Stock out", data: movements.map((item) => item.stockOut), backgroundColor: colors[0] },
              ],
            }}
            options={chartOptions}
          />
        </ReportCard>
        <ReportCard title="Top products by quantity sold" loading={loading} empty={!products.length}>
          <Doughnut
            data={{
              labels: products.map((item) => item.name),
              datasets: [{
                data: products.map((item) => item.quantity),
                backgroundColor: products.map((_, index) => colors[index % colors.length]),
              }],
            }}
            options={chartOptions}
          />
        </ReportCard>
      </div>
    </section>
  );
}
