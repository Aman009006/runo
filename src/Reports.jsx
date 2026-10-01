import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  Send,
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
  const [sendingTelegram, setSendingTelegram] = useState(false);
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
        key: "online_qr",
        name: "Онлайн QR",
        value: Number(payments.online_qr) || 0,
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
  const sendReportToTelegram = async () => {
    if (sendingTelegram) {
      return;
    }

    const reportElement = document.querySelector(".reports-page");

    if (!reportElement) {
      window.alert("Не удалось найти страницу отчёта");

      return;
    }

    try {
      setSendingTelegram(true);
      setError("");

      /*
    |--------------------------------------------------------------------------
    | 1. Делаем screenshot всей страницы
    |--------------------------------------------------------------------------
    */

      const canvas = await html2canvas(reportElement, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      /*
    |--------------------------------------------------------------------------
    | 2. Создаём PDF A4
    |--------------------------------------------------------------------------
    */

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;

      const margin = 5;

      const contentWidth = pageWidth - margin * 2;

      const imageWidth = canvas.width;
      const imageHeight = canvas.height;

      const ratio = contentWidth / imageWidth;

      const scaledHeight = imageHeight * ratio;

      /*
    |--------------------------------------------------------------------------
    | 3. Разбиваем длинный screenshot
    |    на несколько страниц A4
    |--------------------------------------------------------------------------
    */

      let position = 0;
      let pageNumber = 0;

      while (position < scaledHeight) {
        if (pageNumber > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.9),
          "JPEG",
          margin,
          margin - position,
          contentWidth,
          scaledHeight,
        );

        position += pageHeight - margin * 2;

        pageNumber += 1;
      }

      /*
    |--------------------------------------------------------------------------
    | 4. PDF -> Blob
    |--------------------------------------------------------------------------
    */

      const pdfBlob = pdf.output("blob");

      /*
    |--------------------------------------------------------------------------
    | 5. Отправляем PDF на backend
    |--------------------------------------------------------------------------
    */

      const formData = new FormData();

      formData.append("file", pdfBlob, `otchet-${getToday()}.pdf`);

      formData.append(
        "caption",
        `Отчёт кассы\nДата: ${new Date().toLocaleString("ru-RU")}`,
      );

      const response = await fetch(`${API_URL}/api/reports/send-telegram`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось отправить отчёт");
      }

      window.alert("Отчёт успешно отправлен в Telegram");
    } catch (err) {
      console.error("SEND REPORT ERROR:", err);

      setError(err.message || "Не удалось отправить отчёт в Telegram");

      window.alert(err.message || "Не удалось отправить отчёт в Telegram");
    } finally {
      setSendingTelegram(false);
    }
  };
  const clearAllData = async () => {
    const password = window.prompt("Введите пароль для очистки всех данных:");

    if (password === null) {
      return;
    }

    if (password !== "аман159") {
      window.alert("Неверный пароль");
      return;
    }

    const confirmed = window.confirm(
      "ВНИМАНИЕ!\n\nВсе продажи, расходы, бронирования, возвраты и другие данные будут удалены.\n\nПродолжить?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/reports/clear`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось очистить данные");
      }

      window.alert("Все данные успешно очищены");

      await loadReport();
    } catch (err) {
      console.error(err);

      setError(err.message || "Не удалось очистить данные");

      setLoading(false);
    }
  };
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

          <div className="reports-header-actions">
            <button
              className="reports-telegram"
              onClick={sendReportToTelegram}
              disabled={loading || sendingTelegram}
            >
              {sendingTelegram ? (
                <>
                  <RefreshCw size={18} className="reports-spin" />
                  Формирование PDF...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Отправить в Telegram
                </>
              )}
            </button>

            <button
              className="reports-refresh"
              onClick={loadReport}
              disabled={loading || sendingTelegram}
            >
              <RefreshCw size={18} className={loading ? "reports-spin" : ""} />
              Обновить
            </button>
          </div>
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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "30px",
          paddingBottom: "20px",
        }}
      >
        <button
          type="button"
          onClick={clearAllData}
          disabled={loading}
          style={{
            padding: "7px 14px",
            border: "1px solid #dc2626",
            borderRadius: "6px",
            background: "#fff",
            color: "#dc2626",
            fontSize: "12px",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          Очистить все
        </button>
      </div>
    </div>
  );
}
