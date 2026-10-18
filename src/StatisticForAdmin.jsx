
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_URL from "./config.js";
import "./StatisticForAdmin.css";

const BRANCHES = [
  { id: "all", name: "Все филиалы", color: "#64748b" },
  { id: "bishkek", name: "Бишкек", color: "#3B82F6" },
  { id: "dordoy", name: "Дордой", color: "#A855F7" },
  { id: "osh", name: "Ош", color: "#F59E0B" },
];

const COLORS = ["#3B82F6", "#A855F7", "#F59E0B", "#10B981", "#EC4899", "#06B6D4"];

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();

  return {
    from: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: formatDateInput(now),
  };
}

function money(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("ru-RU")} сом`;
}

function number(value) {
  return (Number(value) || 0).toLocaleString("ru-RU");
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function sumReports(reports, field) {
  return reports.reduce(
    (sum, report) => sum + (Number(report[field]) || 0),
    0
  );
}

function mergeProducts(reports) {
  const map = new Map();

  for (const report of reports) {
    for (const product of report.products || []) {
      const key = String(product.id || product.name);
      const existing = map.get(key) || {
        id: key,
        name: product.name || "Без названия",
        article: product.article || "",
        quantity: 0,
        amount: 0,
      };

      existing.quantity += Number(product.quantity) || 0;
      existing.amount += Number(product.amount) || 0;

      map.set(key, existing);
    }
  }

  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}

function mergeSellers(reports) {
  const map = new Map();

  for (const report of reports) {
    for (const seller of report.sellers || []) {
      const key = `${report.branch}:${seller.name}`;
      const existing = map.get(key) || {
        name: seller.id || "Не указан",
        branchName: report.branchName,
        salesCount: 0,
        amount: 0,
      };

      existing.salesCount += Number(seller.salesCount) || 0;
      existing.amount += Number(seller.amount) || 0;

      map.set(key, existing);
    }
  }

  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

function mergeTrend(reports) {
  const map = new Map();

  for (const report of reports) {
    for (const item of report.trend || []) {
      map.set(
        item.date,
        (map.get(item.date) || 0) + (Number(item.amount) || 0)
      );
    }
  }

  return [...map.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function DonutChart({ items = [], total = 0, centerValue, centerLabel }) {
  const validItems = items.filter((item) => Number(item.value) > 0);
  const sum = validItems.reduce(
    (result, item) => result + Number(item.value),
    0
  );

  let offset = 0;

  const segments = validItems.map((item, index) => {
    const value = Number(item.value);
    const length = sum ? (value / sum) * 100 : 0;
    const segment = {
      ...item,
      color: item.color || COLORS[index % COLORS.length],
      length,
      offset,
    };

    offset += length;
    return segment;
  });

  return (
    <div className="stat-donut-layout">
      <div className="stat-donut">
        <svg viewBox="0 0 120 120" role="img" aria-label="Круговая диаграмма">
          <circle
            cx="60"
            cy="60"
            r="43"
            fill="none"
            stroke="#edf0f5"
            strokeWidth="14"
          />

          {segments.map((segment, index) => (
            <circle
              key={`${segment.label}-${index}`}
              cx="60"
              cy="60"
              r="43"
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={`${segment.length} ${100 - segment.length}`}
              strokeDashoffset={-segment.offset}
              pathLength="100"
              transform="rotate(-90 60 60)"
              strokeLinecap="butt"
            />
          ))}
        </svg>

        <div className="stat-donut-center">
          <strong>{centerValue ?? number(total)}</strong>
          <span>{centerLabel || "сом"}</span>
        </div>
      </div>

      <div className="stat-donut-legend">
        {validItems.length ? (
          validItems.map((item, index) => (
            <div className="stat-legend-row" key={`${item.label}-${index}`}>
              <span
                className="stat-legend-dot"
                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
              />
              <span className="stat-legend-name">{item.label}</span>
              <strong>{item.displayValue ?? number(item.value)}</strong>
              <small>{percent(Number(item.value), sum)}%</small>
            </div>
          ))
        ) : (
          <div className="stat-empty-small">Нет данных за период</div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, children, className = "" }) {
  return (
    <section className={`stat-card ${className}`}>
      <div className="stat-card-heading">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="stat-card-main-value">{value}</div>
      {children}
    </section>
  );
}

function TrendChart({ items }) {
  const maxValue = Math.max(1, ...items.map((item) => item.amount));

  if (!items.length) {
    return <div className="stat-empty">Нет продаж за выбранный период</div>;
  }

  return (
    <div className="stat-trend">
      {items.map((item) => (
        <div className="stat-trend-column" key={item.date} title={`${item.date}: ${money(item.amount)}`}>
          <div className="stat-trend-value">{number(item.amount)}</div>
          <div className="stat-trend-bar-wrap">
            <div
              className="stat-trend-bar"
              style={{
                height: `${Math.max(3, (item.amount / maxValue) * 100)}%`,
              }}
            />
          </div>
          <span>{item.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatisticForAdmin() {
  const initialRange = useMemo(() => getCurrentMonthRange(), []);

  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const apiBase = String(API_URL || "").replace(/\/+$/, "");

  const requestToken = useCallback(async () => {
    const password = window.prompt("Введите пароль администратора статистики");

    if (!password) {
      throw new Error("Для просмотра статистики требуется пароль.");
    }

    const response = await fetch(`${apiBase}/api/admin-statistics/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.token) {
      throw new Error(data.message || "Не удалось авторизоваться.");
    }

    sessionStorage.setItem("adminStatsToken", data.token);
    return data.token;
  }, [apiBase]);

  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setError("Укажи обе даты.");
      return;
    }

    if (dateFrom > dateTo) {
      setError("Дата «От» не может быть позже даты «До».");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let token = sessionStorage.getItem("adminStatsToken");

      if (!token) {
        token = await requestToken();
      }

      const query = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        branch: selectedBranch,
      });

      let response = await fetch(
        `${apiBase}/api/admin-statistics/?${query.toString()}`,
        {
          headers: {
            "x-admin-stats-token": token,
          },
        }
      );

      if (response.status === 401) {
        sessionStorage.removeItem("adminStatsToken");
        token = await requestToken();

        response = await fetch(
          `${apiBase}/api/admin-statistics/?${query.toString()}`,
          {
            headers: {
              "x-admin-stats-token": token,
            },
          }
        );
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось загрузить статистику.");
      }

      setReport(data);
    } catch (err) {
      setError(err.message || "Ошибка загрузки статистики.");
    } finally {
      setLoading(false);
    }
  }, [
    apiBase,
    dateFrom,
    dateTo,
    selectedBranch,
    requestToken,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport, reloadKey]);

  const branches = report?.selectedBranches || [];
  const summary = report?.summary || {};

  const products = useMemo(() => mergeProducts(branches), [branches]);
  const sellers = useMemo(() => mergeSellers(branches), [branches]);
  const trend = useMemo(() => mergeTrend(branches), [branches]);

  const branchSales = branches.map((branch) => ({
    label: branch.branchName,
    value: Number(branch.revenue) || 0,
    color: BRANCHES.find((item) => item.id === branch.branch)?.color,
    displayValue: money(branch.revenue),
  }));

  const branchProducts = branches.map((branch) => ({
    label: branch.branchName,
    value: Number(branch.soldQuantity) || 0,
    color: BRANCHES.find((item) => item.id === branch.branch)?.color,
  }));

  const branchExpenses = branches.map((branch) => ({
    label: branch.branchName,
    value: Number(branch.expenses) || 0,
    color: BRANCHES.find((item) => item.id === branch.branch)?.color,
    displayValue: money(branch.expenses),
  }));

  const branchIncoming = branches.map((branch) => ({
    label: branch.branchName,
    value: Number(branch.incomingTotal) || 0,
    color: BRANCHES.find((item) => item.id === branch.branch)?.color,
    displayValue: money(branch.incomingTotal),
  }));

  const branchReturns = branches.map((branch) => ({
    label: branch.branchName,
    value: Number(branch.returns) || 0,
    color: BRANCHES.find((item) => item.id === branch.branch)?.color,
    displayValue: money(branch.returns),
  }));

  const hasStockSource = branches.some((branch) => branch.hasStockSource);
  const stockValue = branches.reduce(
    (sum, branch) => sum + (Number(branch.stockQuantity) || 0),
    0
  );

  return (
    <main className="admin-statistics">
      <header className="stat-page-header">
        <div>
          <h1>Статистика</h1>
          <p>Аналитика продаж и работы филиалов</p>
        </div>

        <button
          type="button"
          className="stat-refresh-button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          {loading ? "Загрузка..." : "Обновить"}
        </button>
      </header>

      <section className="stat-filters">
        <label>
          <span>От</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label>
          <span>До</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        <label className="stat-branch-filter">
          <span>Филиал</span>
          <select
            value={selectedBranch}
            onChange={(event) => setSelectedBranch(event.target.value)}
          >
            {BRANCHES.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && (
        <div className="stat-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
            Повторить
          </button>
        </div>
      )}

      {loading && !report ? (
        <div className="stat-loading">Загружаем реальные данные...</div>
      ) : (
        <>
          <section className="stat-summary-grid">
            <MetricCard
              title="Продажи"
              value={money(summary.revenue)}
              subtitle={`${number(summary.salesCount)} продаж`}
            >
              <DonutChart items={branchSales} total={summary.revenue} />
            </MetricCard>

            <MetricCard
              title="Проданные товары"
              value={number(summary.soldQuantity)}
              subtitle={money(summary.soldProductsAmount)}
            >
              <DonutChart
                items={branchProducts}
                total={summary.soldQuantity}
                centerValue={number(summary.soldQuantity)}
                centerLabel="шт."
              />
            </MetricCard>

            <MetricCard
              title="Расходы"
              value={money(summary.expenses)}
            >
              <DonutChart items={branchExpenses} total={summary.expenses} />
            </MetricCard>

            <MetricCard
              title="Прибыль"
              value={money(summary.afterReturnsAndExpenses)}
              subtitle="Продажи − расходы"
              className="stat-profit-card"
            >
              <div className="stat-profit-note">
                Возвраты и себестоимость не вычитаются.
              </div>
            </MetricCard>

            <MetricCard
              title="Поступления"
              value={money(summary.incomingTotal)}
              subtitle={`${number(summary.incomingCount)} записей`}
            >
              <DonutChart items={branchIncoming} total={summary.incomingTotal} />
            </MetricCard>

            <MetricCard
              title="Возвраты"
              value={money(summary.returns)}
              subtitle={`${number(summary.returnsCount)} записей`}
            >
              <DonutChart items={branchReturns} total={summary.returns} />
            </MetricCard>

            <MetricCard
              title="Остатки"
              value={hasStockSource ? number(stockValue) : "—"}
              subtitle={hasStockSource ? "Количество единиц" : "Источник не подключён"}
            >
              {!hasStockSource && (
                <div className="stat-source-note">
                  Подключи источник складских остатков, чтобы показывать актуальные цифры.
                </div>
              )}
            </MetricCard>

            <MetricCard
              title="Касса"
              value={money(summary.currentCashBalance)}
              subtitle={`Движение за период: ${money(summary.cashFlow)}`}
            />
          </section>

          <section className="stat-details-grid">
            <div className="stat-card stat-trend-card">
              <div className="stat-card-heading">
                <h3>Динамика продаж</h3>
                <span>По дням, сом</span>
              </div>
              <TrendChart items={trend} />
            </div>

            <div className="stat-card">
              <div className="stat-card-heading">
                <h3>Топ продавцов</h3>
                <span>По сумме продаж</span>
              </div>

              {sellers.length ? (
                <div className="stat-table-wrap">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th>Продавец</th>
                        <th>Филиал</th>
                        <th>Продажи</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>

                      {sellers.slice(0, 10).map((seller, index) => (
                        <tr key={`${seller.name}-${seller.branchName}-${index}`}>
                          <td>
                            <span className="stat-rank">{index + 1}</span>
                            {seller.name}
                          </td>
                          <td>{seller.branchName}</td>
                          <td>{number(seller.salesCount)}</td>
                          <td>{money(seller.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="stat-empty">Нет данных о продавцах за период</div>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-card-heading">
                <h3>Популярные товары</h3>
                <span>По количеству проданных единиц</span>
              </div>

              {products.length ? (
                <div className="stat-table-wrap">
                  <table className="stat-table">
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Артикул</th>
                        <th>Кол-во</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 10).map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.article || "—"}</td>
                          <td>{number(product.quantity)}</td>
                          <td>{money(product.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="stat-empty">Нет данных о проданных товарах</div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
