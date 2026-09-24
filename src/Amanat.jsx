
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
  Wallet,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import "./amanat.css";

const API_URL = "http://localhost:5000";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} сом`;
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatMonthTitle(date) {
  return date.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function normalizeItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.rows)) {
    return data.rows;
  }

  return [];
}

function getItemDate(item) {
  return (
    item.date ||
    item.createdAt ||
    item.created ||
    item.updatedAt ||
    item.createdDate ||
    null
  );
}

function getProductName(item) {
  return (
    item.productName ||
    item.name ||
    item.title ||
    item.assortment?.name ||
    item.product?.name ||
    "Без названия"
  );
}

function getItemAmanat(item) {
  return Number(
    item.amanat ??
      item.payment?.amanat ??
      item.payments?.amanat ??
      0,
  );
}

function getItemTotal(item) {
  return Number(
    item.total ??
      item.sum ??
      item.amount ??
      item.totalSum ??
      0,
  );
}

function getItemType(item) {
  const type = String(
    item.type ||
      item.documentType ||
      item.source ||
      "",
  ).toLowerCase();

  if (
    type.includes("reservation") ||
    type.includes("брон")
  ) {
    return "reservation";
  }

  return "sale";
}

function getItemCustomer(item) {
  return (
    item.customerName ||
    item.counterpartyName ||
    item.customer?.name ||
    item.agent?.name ||
    "Без клиента"
  );
}

function getItemId(item) {
  return item.id || item.orderId || item.name || Math.random();
}

function createCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Понедельник = 0
  const firstWeekDay = (firstDay.getDay() + 6) % 7;

  const days = [];

  for (let i = 0; i < firstWeekDay; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function Amanat({ onBack }) {
  const today = new Date();

  const [fromDate, setFromDate] = useState(
    formatDate(getMonthStart(today)),
  );

  const [toDate, setToDate] = useState(
    formatDate(getMonthEnd(today)),
  );

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(null);

  const fetchAmanat = async () => {
    if (!fromDate || !toDate) {
      return;
    }

    if (fromDate > toDate) {
      setError("Дата начала не может быть позже даты окончания");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/moysklad/amanat?from=${fromDate}&to=${toDate}`,
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Не удалось загрузить данные Аманата",
        );
      }

      setItems(normalizeItems(data));
      setSelectedDate(null);
    } catch (err) {
      console.error("Amanat error:", err);

      setError(
        err.message || "Не удалось загрузить данные Аманата",
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmanat();
  }, []);

  const itemsWithDate = useMemo(() => {
    return items
      .map((item) => {
        const rawDate = getItemDate(item);

        if (!rawDate) {
          return null;
        }

        const dateObject = new Date(rawDate);

        if (Number.isNaN(dateObject.getTime())) {
          return null;
        }

        return {
          ...item,
          calendarDate: formatDate(dateObject),
          amanat: getItemAmanat(item),
          total: getItemTotal(item),
          type: getItemType(item),
          customerName: getItemCustomer(item),
        };
      })
      .filter(Boolean);
  }, [items]);

  const totalAmanat = useMemo(() => {
    return itemsWithDate.reduce(
      (sum, item) => sum + item.amanat,
      0,
    );
  }, [itemsWithDate]);

  const dailyTotals = useMemo(() => {
    const result = {};

    itemsWithDate.forEach((item) => {
      if (!result[item.calendarDate]) {
        result[item.calendarDate] = {
          amount: 0,
          count: 0,
          items: [],
        };
      }

      result[item.calendarDate].amount += item.amanat;
      result[item.calendarDate].count += 1;
      result[item.calendarDate].items.push(item);
    });

    return result;
  }, [itemsWithDate]);

  const calendarDays = useMemo(() => {
    return createCalendarDays(currentMonth);
  }, [currentMonth]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return dailyTotals[selectedDate]?.items || [];
  }, [selectedDate, dailyTotals]);

  const changeMonth = (direction) => {
    setCurrentMonth(
      (prev) =>
        new Date(
          prev.getFullYear(),
          prev.getMonth() + direction,
          1,
        ),
    );
  };

  const applyPeriod = () => {
    if (!fromDate || !toDate) {
      return;
    }

    const start = new Date(`${fromDate}T00:00:00`);

    setCurrentMonth(
      new Date(start.getFullYear(), start.getMonth(), 1),
    );

    fetchAmanat();
  };

  const resetCurrentMonth = () => {
    const now = new Date();

    const start = getMonthStart(now);
    const end = getMonthEnd(now);

    const newFrom = formatDate(start);
    const newTo = formatDate(end);

    setFromDate(newFrom);
    setToDate(newTo);
    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );

    setTimeout(() => {
      fetchAmanat();
    }, 0);
  };

  const handleCalendarDateClick = (date) => {
    if (!date) {
      return;
    }

    const dateString = formatDate(date);

    if (!dailyTotals[dateString]) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate(dateString);
  };

  const isToday = (date) => {
    if (!date) {
      return false;
    }

    return formatDate(date) === formatDate(today);
  };

  const isOutsideSelectedPeriod = (date) => {
    if (!date) {
      return false;
    }

    const value = formatDate(date);

    return value < fromDate || value > toDate;
  };

  return (
    <div className="amanat-page">
      <div className="amanat-container">
        {/* HEADER */}
        <div className="amanat-header">
          <div className="amanat-header-left">
            <button
              className="amanat-back-button"
              onClick={onBack}
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1>Аманат</h1>
              <p>
                Покупки и брони с оплатой через Аманат
              </p>
            </div>
          </div>

          <button
            className="amanat-refresh-button"
            onClick={fetchAmanat}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "amanat-spin" : ""}
            />

            {loading ? "Загрузка..." : "Обновить"}
          </button>
        </div>

        {/* FILTERS */}
        <div className="amanat-filters">
          <div className="amanat-date-field">
            <label>От</label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="amanat-date-field">
            <label>До</label>

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            className="amanat-apply-button"
            onClick={applyPeriod}
            disabled={loading}
          >
            <CalendarDays size={17} />
            Показать
          </button>

          <button
            className="amanat-current-button"
            onClick={resetCurrentMonth}
          >
            Текущий месяц
          </button>
        </div>

        {error && (
          <div className="amanat-error">
            <span>{error}</span>

            <button onClick={fetchAmanat}>
              Повторить
            </button>
          </div>
        )}

        {/* TOTAL */}
        <div className="amanat-summary">
          <div className="amanat-summary-icon">
            <Wallet size={25} />
          </div>

          <div className="amanat-summary-content">
            <div className="amanat-summary-label">
              Аманат за выбранный период
            </div>

            <div className="amanat-summary-value">
              {formatMoney(totalAmanat)}
            </div>
          </div>

          <div className="amanat-summary-count">
            <span>{itemsWithDate.length}</span>
            <small>операций</small>
          </div>
        </div>

        {/* CALENDAR */}
        <div className="amanat-calendar-card">
          <div className="amanat-calendar-header">
            <button
              className="amanat-month-button"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="amanat-month-title">
              {formatMonthTitle(currentMonth)}
            </div>

            <button
              className="amanat-month-button"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="amanat-weekdays">
            <div>Пн</div>
            <div>Вт</div>
            <div>Ср</div>
            <div>Чт</div>
            <div>Пт</div>
            <div>Сб</div>
            <div>Вс</div>
          </div>

          <div className="amanat-calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="amanat-calendar-cell empty"
                  />
                );
              }

              const dateString = formatDate(date);
              const dayData = dailyTotals[dateString];
              const amount = dayData?.amount || 0;
              const count = dayData?.count || 0;

              const selected =
                selectedDate === dateString;

              const outside =
                isOutsideSelectedPeriod(date);

              return (
                <button
                  key={dateString}
                  className={[
                    "amanat-calendar-cell",
                    amount > 0 ? "has-amanat" : "",
                    isToday(date) ? "today" : "",
                    selected ? "selected" : "",
                    outside ? "outside-period" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    handleCalendarDateClick(date)
                  }
                >
                  <div className="amanat-day-number">
                    {date.getDate()}
                  </div>

                  {amount > 0 && (
                    <div className="amanat-day-amount">
                      {formatMoney(amount)}
                    </div>
                  )}

                  {count > 0 && (
                    <div className="amanat-day-count">
                      {count}{" "}
                      {count === 1
                        ? "операция"
                        : count < 5
                          ? "операции"
                          : "операций"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DATE */}
        {selectedDate && (
          <div className="amanat-day-details">
            <div className="amanat-details-header">
              <div>
                <h2>
                  {new Date(
                    `${selectedDate}T00:00:00`,
                  ).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>

                <p>
                  {formatMoney(
                    dailyTotals[selectedDate]?.amount || 0,
                  )}
                </p>
              </div>

              <button
                onClick={() => setSelectedDate(null)}
                className="amanat-close-details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="amanat-operation-list">
              {selectedItems.map((item, index) => (
                <div
                  className="amanat-operation"
                  key={`${getItemId(item)}-${index}`}
                >
                  <div className="amanat-operation-icon">
                    {item.type === "reservation" ? (
                      <Package size={19} />
                    ) : (
                      <ShoppingCart size={19} />
                    )}
                  </div>

                  <div className="amanat-operation-main">
                    <div className="amanat-operation-title">
                      {item.type === "reservation"
                        ? "Бронь"
                        : "Продажа"}
                    </div>

                    <div className="amanat-operation-customer">
                      {item.customerName}
                    </div>

                    {item.customerPhone && (
                      <div className="amanat-operation-phone">
                        {item.customerPhone}
                      </div>
                    )}
                    {Array.isArray(item.items) && item.items.length > 0 && (
  <div className="amanat-operation-products">
    {item.items.map((product, productIndex) => (
      <div
        className="amanat-operation-product"
        key={`${getItemId(item)}-product-${productIndex}`}
      >
        <div className="amanat-operation-product-name">
          {getProductName(product)}
        </div>

        {product.quantity != null && (
          <div className="amanat-operation-product-quantity">
            Количество: {product.quantity}
          </div>
        )}
      </div>
    ))}
  </div>
)}
                  </div>

                  <div className="amanat-operation-right">
                    <strong>
                      {formatMoney(item.amanat)}
                    </strong>

                    {item.total > 0 && (
                      <span>
                        Всего: {formatMoney(item.total)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY */}
        {!loading && itemsWithDate.length === 0 && (
          <div className="amanat-empty">
            <Wallet size={38} />

            <h3>Операций Аманата нет</h3>

            <p>
              За выбранный период не найдено покупок или
              бронирований с оплатой через Аманат.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Amanat;

