import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
  ShoppingCart,
  Banknote,
  CreditCard,
  WalletCards,
  Clock,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  return `${day}.${month}.${year}`;
}

function formatMoney(value) {
  const number = Number(value || 0);

  return number.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/*
 * Все эти значения должны быть именно в СОМ:
 *
 * payment.cashSom
 * payment.cardSom
 * payment.amanatSom
 * payment.mplusSom
 *
 * Не используем payment.cash/card/amanat/mplus,
 * потому что они могут храниться в копейках.
 */
function getPaymentAmounts(payment = {}) {
  return {
    cash: Number(payment.cashSom || 0),
    card: Number(payment.cardSom || 0),
    amanat: Number(payment.amanatSom || 0),
    mplus: Number(payment.mplusSom || 0),
  };
}

function getPaymentMethods(payment = {}) {
  const amounts = getPaymentAmounts(payment);

  const methods = [];

  if (amounts.cash > 0) {
    methods.push({
      key: "cash",
      name: "Наличные",
      amount: amounts.cash,
    });
  }

  if (amounts.card > 0) {
    methods.push({
      key: "card",
      name: "Карта",
      amount: amounts.card,
    });
  }

  if (amounts.amanat > 0) {
    methods.push({
      key: "amanat",
      name: "Аманат",
      amount: amounts.amanat,
    });
  }

  if (amounts.mplus > 0) {
    methods.push({
      key: "mplus",
      name: "М+",
      amount: amounts.mplus,
    });
  }

  /*
   * Для старых продаж, где Som-поля отсутствуют,
   * определяем только название способа.
   *
   * Сумму здесь специально не берём из cash/card/etc.,
   * чтобы снова не получить ×100.
   */
  if (methods.length === 0 && payment.method) {
    const methodMap = {
      cash: "Наличные",
      card: "Карта",
      amanat: "Аманат",
      credit: "Аманат",
      mplus: "М+",
      delivery: "М+",
    };

    const methodName = methodMap[payment.method];

    if (methodName) {
      methods.push({
        key:
          payment.method === "credit"
            ? "amanat"
            : payment.method === "delivery"
              ? "mplus"
              : payment.method,
        name: methodName,
        amount: 0,
      });
    }
  }

  return methods;
}

function getSinglePaymentName(method) {
  const names = {
    cash: "Наличные",
    card: "Карта",
    amanat: "Аманат",
    mplus: "М+",
    credit: "Аманат",
    delivery: "М+",
  };

  return names[method] || method || "Не указан";
}

function getPaymentType(payment = {}) {
  const methods = getPaymentMethods(payment);

  if (methods.length >= 2) {
    return "mixed";
  }

  if (methods.length === 1) {
    return "single";
  }

  if (payment.method === "all" || payment.method === "mixed") {
    return "mixed";
  }

  return "unknown";
}

function getPaymentName(payment = {}) {
  const methods = getPaymentMethods(payment);
  const paymentType = getPaymentType(payment);

  if (paymentType === "mixed") {
    if (methods.length === 0) {
      return (
        <div>
          <div style={styles.paymentMainName}>Смешанная</div>

          <div style={styles.paymentBreakdown}>
            Нет данных по способам оплаты
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={styles.paymentMainName}>Смешанная</div>

        <div style={styles.paymentBreakdown}>
          {methods.map((method, index) => (
            <React.Fragment key={method.key}>
              {index > 0 && <span style={styles.paymentPlus}>{" + "}</span>}

              <span>
                {method.name} {formatMoney(method.amount)} сом
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (paymentType === "single") {
    const method = methods[0];

    return (
      <div>
        <div style={styles.paymentMainName}>{method.name}</div>

        <div style={styles.paymentBreakdown}>
          {formatMoney(method.amount)} сом
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.paymentMainName}>
        {getSinglePaymentName(payment.method)}
      </div>
    </div>
  );
}

function getPaymentIcon(payment = {}) {
  const methods = getPaymentMethods(payment);

  if (methods.length >= 2) {
    return WalletCards;
  }

  if (methods[0]?.key === "cash") {
    return Banknote;
  }

  if (methods[0]?.key === "card") {
    return CreditCard;
  }

  return WalletCards;
}

function getSaleAmountForFilter(sale, filter) {
  const totalSom = Number(sale.totalSom || 0);

  if (filter === "all") {
    return totalSom;
  }

  const payment = sale.payment || {};
  const amounts = getPaymentAmounts(payment);
  const methods = getPaymentMethods(payment);

  if (filter === "mixed") {
    if (methods.length >= 2) {
      return totalSom;
    }

    return 0;
  }

  if (filter === "cash") {
    return amounts.cash;
  }

  if (filter === "card") {
    return amounts.card;
  }

  if (filter === "amanat") {
    return amounts.amanat;
  }

  if (filter === "mplus") {
    return amounts.mplus;
  }

  return 0;
}

function matchesPaymentFilter(sale, filter) {
  if (filter === "all") {
    return true;
  }

  const payment = sale.payment || {};
  const methods = getPaymentMethods(payment);

  if (filter === "mixed") {
    return methods.length >= 2;
  }

  return methods.some((method) => method.key === filter);
}

function formatTime(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentFilterName(filter) {
  const names = {
    all: "Все способы",
    cash: "Наличные",
    card: "Карта",
    amanat: "Аманат",
    mplus: "М+",
    mixed: "Смешанная",
  };

  return names[filter] || "Все способы";
}

/*
 * Получаем товары для отображения в истории.
 *
 * Пример:
 *
 * [
 *   "Футболка × 2",
 *   "Кроссовки × 1"
 * ]
 */
function getSaleItems(sale) {
  if (!Array.isArray(sale.items)) {
    return [];
  }

  return sale.items.map((item, index) => {
    const name =
      item.name ||
      item.title ||
      item.productName ||
      item.assortmentName ||
      "Товар";

    const quantity = Number(item.quantity || 0);

    return {
      id: item.id || index,
      name,
      quantity,
    };
  });
}

export default function SalesHistory({ onBack }) {
  const today = getToday();

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [paymentFilter, setPaymentFilter] = useState("all");

  const [salesByDate, setSalesByDate] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSales = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/moysklad/sales`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось загрузить историю продаж");
      }

      setSalesByDate(data.byDate || {});
    } catch (err) {
      console.error("Ошибка загрузки истории продаж:", err);

      setError(err.message || "Не удалось загрузить историю продаж");

      setSalesByDate({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    if (!dateFrom || !dateTo) {
      return [];
    }

    if (dateFrom > dateTo) {
      return [];
    }

    const result = [];

    Object.entries(salesByDate).forEach(([date, sales]) => {
      if (date < dateFrom || date > dateTo) {
        return;
      }

      if (!Array.isArray(sales)) {
        return;
      }

      sales.forEach((sale) => {
        if (!matchesPaymentFilter(sale, paymentFilter)) {
          return;
        }

        const filteredAmount = getSaleAmountForFilter(sale, paymentFilter);

        result.push({
          ...sale,
          date,
          filteredAmount,
        });
      });
    });

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();

      const dateB = new Date(b.createdAt || 0).getTime();

      return dateB - dateA;
    });

    return result;
  }, [salesByDate, dateFrom, dateTo, paymentFilter]);

  const totalSum = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) => sum + Number(sale.filteredAmount || 0),
      0,
    );
  }, [filteredSales]);

  const setToday = () => {
    const currentToday = getToday();

    setDateFrom(currentToday);
    setDateTo(currentToday);
  };

  const setAllDates = () => {
    const dates = Object.keys(salesByDate);

    if (dates.length === 0) {
      setToday();
      return;
    }

    const sortedDates = [...dates].sort();

    setDateFrom(sortedDates[0]);
    setDateTo(sortedDates[sortedDates.length - 1]);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button type="button" onClick={onBack} style={styles.backButton}>
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 style={styles.title}>История продаж</h1>

              <div style={styles.subtitle}>Локальная история продаж кассы</div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchSales}
            disabled={loading}
            style={styles.refreshButton}
          >
            <RefreshCw
              size={18}
              style={loading ? styles.refreshIconLoading : undefined}
            />

            {loading ? "Обновление..." : "Обновить"}
          </button>
        </div>

        {/* FILTERS */}
        <div style={styles.filtersCard}>
          <div style={styles.filterItem}>
            <label style={styles.label}>
              <CalendarDays size={16} />
              Дата от
            </label>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>
              <CalendarDays size={16} />
              Дата до
            </label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>
              <WalletCards size={16} />
              Способ оплаты
            </label>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">Все способы</option>

              <option value="cash">Наличные</option>

              <option value="card">Карта</option>

              <option value="amanat">Аманат</option>

              <option value="mplus">М+</option>

              <option value="mixed">Смешанная</option>
            </select>
          </div>

          <div style={styles.filterButtons}>
            <button
              type="button"
              onClick={setToday}
              style={styles.secondaryButton}
            >
              Сегодня
            </button>

            <button
              type="button"
              onClick={setAllDates}
              style={styles.secondaryButton}
            >
              Все даты
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={styles.error}>
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {/* SUMMARY */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <ShoppingCart size={22} />
            </div>

            <div>
              <div style={styles.summaryLabel}>Продаж</div>

              <div style={styles.summaryValue}>{filteredSales.length}</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <Banknote size={22} />
            </div>

            <div>
              <div style={styles.summaryLabel}>Сумма</div>

              <div style={styles.summaryValue}>{formatMoney(totalSum)} сом</div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>
              <WalletCards size={22} />
            </div>

            <div>
              <div style={styles.summaryLabel}>Фильтр</div>

              <div
                style={{
                  ...styles.summaryValue,
                  fontSize: 18,
                }}
              >
                {getPaymentFilterName(paymentFilter)}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <div style={styles.tableHeaderCell}>Продажа</div>

            <div style={styles.tableHeaderCell}>Способ оплаты</div>
            <div style={styles.tableHeaderCell}>Продавец</div>
            <div
              style={{
                ...styles.tableHeaderCell,
                textAlign: "right",
              }}
            >
              Сумма
            </div>
          </div>

          {loading ? (
            <div style={styles.emptyState}>
              <RefreshCw size={28} style={styles.refreshIconLoading} />

              <div>Загрузка истории продаж...</div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div style={styles.emptyState}>
              <ShoppingCart size={40} />

              <div style={styles.emptyTitle}>Продажи не найдены</div>

              <div style={styles.emptyText}>
                За выбранный период и способ оплаты продаж нет
              </div>
            </div>
          ) : (
            <>
              {filteredSales.map((sale, index) => {
                const payment = sale.payment || {};

                const paymentType = getPaymentType(payment);

                const Icon = getPaymentIcon(payment);

                const isFilteredMethod =
                  paymentFilter !== "all" && paymentFilter !== "mixed";

                const fullTotal = Number(sale.totalSom || 0);

                const saleItems = getSaleItems(sale);

                return (
                  <div
                    key={
                      sale.id || sale.orderId || `${sale.createdAt}-${index}`
                    }
                    style={styles.tableRow}
                  >
                    {/* SALE / PRODUCTS */}
                    <div style={styles.saleCell}>
                      <div style={styles.saleIcon}>
                        <ShoppingCart size={18} />
                      </div>

                      <div style={styles.productsContent}>
                        {saleItems.length > 0 ? (
                          saleItems.map((item) => (
                            <div key={item.id} style={styles.productRow}>
                              <span style={styles.productName}>
                                {item.name}
                              </span>

                              <span style={styles.productQuantity}>
                                × {item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div style={styles.productName}>
                            Товары не указаны
                          </div>
                        )}

                        <div style={styles.saleMeta}>
                          <Clock size={13} />

                          {formatTime(sale.createdAt)}

                          <span>{formatDate(sale.date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* PAYMENT */}
                    <div style={styles.paymentCell}>
                      <div style={styles.paymentIcon}>
                        <Icon size={17} />
                      </div>

                      <div style={styles.paymentContent}>
                        {getPaymentName(payment)}

                        {isFilteredMethod && paymentType === "mixed" && (
                          <div style={styles.filteredPaymentHint}>
                            Из общей суммы {formatMoney(fullTotal)} сом
                          </div>
                        )}
                      </div>
                    </div>
                    {/* SALESPERSON */}
                    <div style={styles.salespersonCell}>
                      <div style={styles.salespersonName}>
                        {sale.salesperson?.id || "Не указан"}
                      </div>

          
                    </div>
                    {/* AMOUNT */}
                    <div style={styles.amountCell}>
                      <div style={styles.amount}>
                        {formatMoney(sale.filteredAmount)} сом
                      </div>

                      {isFilteredMethod && paymentType === "mixed" && (
                        <div style={styles.amountHint}>
                          {
                            {
                              cash: "Наличные",
                              card: "Карта",
                              amanat: "Аманат",
                              mplus: "М+",
                            }[paymentFilter]
                          }
                        </div>
                      )}

                      {paymentType === "mixed" && paymentFilter === "all" && (
                        <div style={styles.amountHint}>Общая сумма продажи</div>
                      )}

                      {paymentType === "mixed" && paymentFilter === "mixed" && (
                        <div style={styles.amountHint}>Все способы</div>
                      )}

                      {paymentType === "single" && paymentFilter === "all" && (
                        <div style={styles.amountHint}>
                          {getPaymentMethods(payment)[0]?.name || "Оплата"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* TOTAL */}
              <div style={styles.tableFooter}>
                <div style={styles.footerLeft}>Итого</div>

                <div style={styles.footerCenter}>
                  {filteredSales.length}{" "}
                  {filteredSales.length === 1 ? "продажа" : "продаж"}
                </div>

                <div style={styles.footerTotal}>
                  {formatMoney(totalSum)} сом
                </div>
              </div>
            </>
          )}
        </div>

        {/* INFO */}
        <div style={styles.infoCard}>
          <div style={styles.infoTitle}>Как работает фильтр оплаты</div>

          <div style={styles.infoText}>
            <div>
              <strong>Все способы</strong> — показывает все продажи и считает
              полную сумму каждой продажи.
            </div>

            <div>
              <strong>Наличные / Карта / Аманат / М+</strong> — показывает
              обычные продажи этим способом, а также смешанные продажи, где этот
              способ присутствует. В итог попадает только сумма выбранного
              способа.
            </div>

            <div>
              <strong>Смешанная</strong> — показывает только продажи, где
              использовано два или больше способов оплаты, и считает их полную
              сумму.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#0f172a",
    padding: "28px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  backButton: {
    width: "44px",
    height: "44px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#0f172a",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 750,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    marginTop: "5px",
    fontSize: "14px",
    color: "#64748b",
  },

  refreshButton: {
    height: "44px",
    padding: "0 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },

  refreshIconLoading: {
    animation: "spin 1s linear infinite",
  },

  filtersCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 1fr) minmax(180px, 1fr) minmax(220px, 1fr) auto",
    gap: "16px",
    alignItems: "end",
    boxSizing: "border-box",
    marginBottom: "16px",
  },

  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "13px",
    fontWeight: 650,
    color: "#475569",
  },

  dateInput: {
    width: "100%",
    height: "42px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },

  select: {
    width: "100%",
    height: "42px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    cursor: "pointer",
  },

  filterButtons: {
    display: "flex",
    gap: "8px",
  },

  secondaryButton: {
    height: "42px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  filterInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    background: "#f1f5f9",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "16px",
    color: "#475569",
    fontSize: "14px",
  },

  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "14px 16px",
    borderRadius: "12px",
    marginBottom: "16px",
    fontSize: "14px",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  summaryIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#334155",
    flexShrink: 0,
  },

  summaryLabel: {
    color: "#64748b",
    fontSize: "13px",
    marginBottom: "3px",
  },

  summaryValue: {
    fontSize: "23px",
    fontWeight: 750,
    color: "#0f172a",
  },

  tableCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    overflow: "hidden",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1.5fr 0.9fr 0.7fr",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    padding: "14px 20px",
    gap: "20px",
  },
  salespersonCell: {
    minWidth: 0,
  },

  salespersonName: {
    fontSize: "14px",
    fontWeight: 650,
    color: "#0f172a",
    wordBreak: "break-word",
  },

  salespersonId: {
    marginTop: "4px",
    color: "#94a3b8",
    fontSize: "11px",
    wordBreak: "break-word",
  },

  tableHeaderCell: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 700,
    color: "#64748b",
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1.5fr 0.9fr 0.7fr",
    padding: "18px 20px",
    gap: "20px",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
  },

  saleCell: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    minWidth: 0,
  },

  saleIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#334155",
    flexShrink: 0,
  },

  productsContent: {
    minWidth: 0,
    width: "100%",
  },

  productRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    lineHeight: 1.4,
    marginBottom: "3px",
  },

  productName: {
    fontSize: "14px",
    fontWeight: 650,
    color: "#0f172a",
    wordBreak: "break-word",
  },

  productQuantity: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#475569",
    whiteSpace: "nowrap",
  },

  orderId: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  saleMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "7px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  paymentCell: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    minWidth: 0,
  },

  paymentIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#475569",
    flexShrink: 0,
  },

  paymentContent: {
    minWidth: 0,
    paddingTop: "1px",
  },

  paymentMainName: {
    fontSize: "14px",
    fontWeight: 650,
    color: "#0f172a",
  },

  paymentBreakdown: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  paymentPlus: {
    color: "#94a3b8",
  },

  filteredPaymentHint: {
    marginTop: "5px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  amountCell: {
    textAlign: "right",
  },

  amount: {
    fontSize: "16px",
    fontWeight: 750,
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  amountHint: {
    marginTop: "4px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  tableFooter: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1.5fr 0.9fr 0.7fr",
    padding: "18px 20px",
    gap: "20px",
    alignItems: "center",
    background: "#f8fafc",
  },

  footerLeft: {
    fontSize: "15px",
    fontWeight: 750,
  },

  footerCenter: {
    fontSize: "13px",
    color: "#64748b",
  },

  footerTotal: {
    textAlign: "right",
    fontSize: "20px",
    fontWeight: 800,
    color: "#0f172a",
    whiteSpace: "nowrap",
  },

  emptyState: {
    minHeight: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "#94a3b8",
  },

  emptyTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#475569",
  },

  emptyText: {
    fontSize: "13px",
    color: "#94a3b8",
  },

  infoCard: {
    marginTop: "18px",
    padding: "18px 20px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
  },

  infoTitle: {
    fontSize: "14px",
    fontWeight: 750,
    marginBottom: "10px",
    color: "#0f172a",
  },

  infoText: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },
};
