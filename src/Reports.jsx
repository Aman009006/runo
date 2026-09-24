import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CalendarDays,
  RotateCcw,
  Package,
  Banknote,
  ChevronDown,
} from "lucide-react";

import "./reports.css";

import API_URL from "./config.js";

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU").format(
    Math.round(Number(value) || 0),
  )} сом`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDaysAgo(days) {
  const date = new Date();

  date.setDate(date.getDate() - days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const TYPE_LABELS = {
  sale: "Продажа",
  reservation: "Бронирование",
  deposit: "Внесение",
  withdraw: "Инкассация",
  return: "Возврат",
  buyFromPostavshik: "Поставщик",
  Rashod: "Расход",
  expense: "Расход",
  unknown: "Другое",
};

function TypeBadge({ type }) {
  return (
    <span className={`report-type report-type-${type}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function BarChart({ data }) {
  if (!data.length) {
    return (
      <div className="report-empty-chart">Нет данных за выбранный период</div>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="report-bars">
      {data.map((item) => {
        const percent = Math.max(4, (item.value / max) * 100);

        return (
          <div className="report-bar-row" key={item.name}>
            <div className="report-bar-name">{item.name}</div>

            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{
                  width: `${percent}%`,
                }}
              />
            </div>

            <div className="report-bar-value">{formatMoney(item.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// function LineChart({ data }) {
//   if (!data.length) {
//     return (
//       <div className="report-empty-chart">
//         Нет данных за выбранный период
//       </div>
//     );
//   }

//   const width = 900;
//   const height = 300;
//   const padding = 35;

//   const values = data.map((item) => item.net);

//   const max = Math.max(...values, 0);
//   const min = Math.min(...values, 0);

//   const range = Math.max(max - min, 1);

//   const points = data
//     .map((item, index) => {
//       const x =
//         data.length === 1
//           ? width / 2
//           : padding +
//             (index / (data.length - 1)) *
//               (width - padding * 2);

//       const y =
//         height -
//         padding -
//         ((item.net - min) / range) *
//           (height - padding * 2);

//       return `${x},${y}`;
//     })
//     .join(" ");

//   return (
//     <div className="report-line-chart">
//       <svg
//         viewBox={`0 0 ${width} ${height}`}
//         preserveAspectRatio="none"
//       >
//         <line
//           x1={padding}
//           y1={height - padding}
//           x2={width - padding}
//           y2={height - padding}
//           className="chart-axis"
//         />

//         <polyline
//           points={points}
//           fill="none"
//           className="chart-line"
//         />

//         {data.map((item, index) => {
//           const x =
//             data.length === 1
//               ? width / 2
//               : padding +
//                 (index / (data.length - 1)) *
//                   (width - padding * 2);

//           const y =
//             height -
//             padding -
//             ((item.net - min) / range) *
//               (height - padding * 2);

//           return (
//             <circle
//               key={item.date}
//               cx={x}
//               cy={y}
//               r="4"
//               className="chart-point"
//             />
//           );
//         })}
//       </svg>

//       <div className="chart-labels">
//         {data.map((item) => (
//           <span key={item.date}>
//             {item.date.slice(5)}
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// }

function SalesByPaymentChart({ data }) {
  if (!data.length) {
    return (
      <div className="report-empty-chart">Нет продаж за выбранный период</div>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="report-sales-payment">
      {data.map((item) => {
        const percent = Math.max(4, (item.value / max) * 100);

        return (
          <div className="report-sales-payment-row" key={item.name}>
            <div className="report-sales-payment-top">
              <span className="report-sales-payment-name">{item.name}</span>

              <span className="report-sales-payment-value">
                {formatMoney(item.value)}
              </span>
            </div>

            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{
                  width: `${percent}%`,
                }}
              />
            </div>

            <div className="report-sales-payment-percent">
              {item.percent.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ icon: Icon, title, value, description, type = "" }) {
  return (
    <div className={`report-card ${type}`}>
      <div className="report-card-top">
        <div className="report-card-icon">
          <Icon size={20} />
        </div>

        <span>{title}</span>
      </div>

      <div className="report-card-value">{value}</div>

      {description && (
        <div className="report-card-description">{description}</div>
      )}
    </div>
  );
}

export default function Reports({ onBack }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState("today");

  const [from, setFrom] = useState(getToday());
  const [to, setTo] = useState(getToday());

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (from) {
        params.set("from", from);
      }

      if (to) {
        params.set("to", to);
      }

      const response = await fetch(
        `${API_URL}/api/reports?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Ошибка загрузки отчёта");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Ошибка загрузки отчёта");
      }

      setReport(data);
    } catch (err) {
      console.error(err);

      setError(err.message || "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [from, to]);

  const changePeriod = (value) => {
    setPeriod(value);

    const today = getToday();

    if (value === "today") {
      setFrom(today);
      setTo(today);
      return;
    }

    if (value === "7days") {
      setFrom(getDaysAgo(6));
      setTo(today);
      return;
    }

    if (value === "30days") {
      setFrom(getDaysAgo(29));
      setTo(today);
      return;
    }

    if (value === "all") {
      setFrom("");
      setTo("");
    }
  };

  const summary = report?.summary || {};
  const salesByPayment = useMemo(() => {
    const payments = report?.salesByPayment || {};

    const items = [
      {
        key: "cash",
        name: "Наличные",
        value: Number(payments.cash) || 0,
      },
      {
        key: "card",
        name: "Карта",
        value: Number(payments.card) || 0,
      },
      {
        key: "amanat",
        name: "Аманат",
        value: Number(payments.amanat) || 0,
      },
      {
        key: "mplus",
        name: "M+",
        value: Number(payments.mplus) || 0,
      },
      {
        key: "local",
        name: "Локальная оплата",
        value: Number(payments.local) || 0,
      },
    ];

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return items
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percent: total > 0 ? (item.value / total) * 100 : 0,
      }));
  }, [report]);

  const daily = useMemo(() => report?.daily || [], [report]);

  const expenseCategories = useMemo(
    () => report?.expensesByCategory || [],
    [report],
  );

  const operationTypes = useMemo(() => report?.operationTypes || [], [report]);

  return (
    <div className="reports-page">
      <div className="reports-container">
        <header className="reports-header">
          <div className="reports-title-wrap">
            <button className="reports-back" onClick={onBack}>
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1>Отчёт</h1>
              <p>Финансовый отчёт и движение денег</p>
            </div>
          </div>

          <button
            className="reports-refresh"
            onClick={loadReport}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "reports-spin" : ""} />
            Обновить
          </button>
        </header>

        <div className="reports-period">
          <div className="reports-period-buttons">
            <button
              className={period === "today" ? "active" : ""}
              onClick={() => changePeriod("today")}
            >
              Сегодня
            </button>

            <button
              className={period === "7days" ? "active" : ""}
              onClick={() => changePeriod("7days")}
            >
              7 дней
            </button>

            <button
              className={period === "30days" ? "active" : ""}
              onClick={() => changePeriod("30days")}
            >
              30 дней
            </button>

            <button
              className={period === "all" ? "active" : ""}
              onClick={() => changePeriod("all")}
            >
              Всё время
            </button>
          </div>

          <div className="reports-date-inputs">
            <CalendarDays size={18} />

            <input
              type="date"
              value={from}
              onChange={(event) => {
                setPeriod("custom");
                setFrom(event.target.value);
              }}
            />

            <span>—</span>

            <input
              type="date"
              value={to}
              onChange={(event) => {
                setPeriod("custom");
                setTo(event.target.value);
              }}
            />
          </div>
        </div>

        {error && <div className="reports-error">{error}</div>}

        {loading && !report ? (
          <div className="reports-loading">
            <RefreshCw size={26} className="reports-spin" />
            Загрузка отчёта...
          </div>
        ) : (
          <>
            <section className="reports-cards">
              <ReportCard
                icon={Wallet}
                title="Баланс кассы"
                value={formatMoney(report?.balance)}
                description="Текущий баланс"
                type="balance"
              />

              <ReportCard
                icon={TrendingUp}
                title="Приход"
                value={formatMoney(summary.income)}
                description="Продажи + бронирования"
                type="income"
              />

              <ReportCard
                icon={TrendingDown}
                title="Расход"
                value={formatMoney(summary.expenses)}
                description="Расходы за период"
                type="expense"
              />

              <ReportCard
                icon={ShoppingCart}
                title="Продажи"
                value={formatMoney(summary.sales)}
                description={`${summary.salesCount || 0} операций`}
              />

              <ReportCard
                icon={CalendarDays}
                title="Бронирования"
                value={formatMoney(summary.reservations)}
                description={`${summary.reservationsCount || 0} операций`}
              />

              <ReportCard
                icon={RotateCcw}
                title="Возвраты"
                value={formatMoney(summary.returns)}
                description={`${summary.returnsCount || 0} операций`}
              />

              <ReportCard
                icon={Package}
                title="Поставщики"
                value={formatMoney(summary.supplierPayments)}
                description="Оплата поставщикам"
              />

              <ReportCard
                icon={Banknote}
                title="Чистое движение"
                value={formatMoney(summary.netCashFlow)}
                description="Приход − расход"
              />
            </section>

            <section className="reports-grid">
              <div className="report-panel report-panel-wide">
                <div className="report-panel-header">
                  <div>
                    <h2>Всего продаж</h2>

                    <p>Продажи всеми способами оплаты</p>
                  </div>

                  <div className="report-sales-total">
                    {formatMoney(summary.sales)}
                  </div>
                </div>

                <SalesByPaymentChart data={salesByPayment} />
              </div>

              <div className="report-panel">
                <div className="report-panel-header">
                  <div>
                    <h2>Расходы по категориям</h2>

                    <p>Распределение расходов</p>
                  </div>
                </div>

                <BarChart data={expenseCategories} />
              </div>

              <div className="report-panel">
                <div className="report-panel-header">
                  <div>
                    <h2>Операции кассы</h2>

                    <p>Типы операций за период</p>
                  </div>
                </div>

                <BarChart
                  data={operationTypes.map((item) => ({
                    ...item,
                    name: TYPE_LABELS[item.name] || item.name,
                  }))}
                />
              </div>
            </section>

            <section className="report-panel">
              <div className="report-panel-header">
                <div>
                  <h2>Движение по дням</h2>

                  <p>Детальная статистика</p>
                </div>
              </div>

              <div className="daily-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Продажи</th>
                      <th>Брони</th>
                      <th>Расходы</th>
                      <th>Возвраты</th>
                      <th>Поставщики</th>
                      <th>Внесение</th>
                      <th>Инкассация</th>
                      <th>Итого</th>
                    </tr>
                  </thead>

                  <tbody>
                    {daily.length ? (
                      daily.map((item) => (
                        <tr key={item.date}>
                          <td>{item.date}</td>

                          <td className="positive">
                            {formatMoney(item.sales)}
                          </td>

                          <td className="positive">
                            {formatMoney(item.reservations)}
                          </td>

                          <td className="negative">
                            {formatMoney(item.expenses)}
                          </td>

                          <td className="negative">
                            {formatMoney(item.returns)}
                          </td>

                          <td className="negative">
                            {formatMoney(item.supplierPayments)}
                          </td>

                          <td className="positive">
                            {formatMoney(item.deposits)}
                          </td>

                          <td className="negative">
                            {formatMoney(item.withdraws)}
                          </td>

                          <td
                            className={item.net >= 0 ? "positive" : "negative"}
                          >
                            {formatMoney(item.net)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="table-empty">
                          Нет данных
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-panel">
              <div className="report-panel-header">
                <div>
                  <h2>История операций</h2>

                  <p>Все операции кассы за выбранный период</p>
                </div>
              </div>

              <div className="daily-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Тип</th>
                      <th>Сумма</th>
                      <th>Ответственный</th>
                      <th>Комментарий</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report?.transactions?.length ? (
                      report.transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{formatDate(transaction.createdAt)}</td>

                          <td>
                            <TypeBadge type={transaction.type} />
                          </td>

                          <td
                            className={
                              transaction.amount >= 0 ? "positive" : "negative"
                            }
                          >
                            {transaction.amount >= 0 ? "+" : ""}
                            {formatMoney(transaction.amount)}
                          </td>

                          <td>{transaction.responsible || "-"}</td>

                          <td>{transaction.comment || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty">
                          Нет операций
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
