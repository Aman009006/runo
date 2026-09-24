import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  Trash2,
  Pencil,
  CalendarDays,
  CreditCard,
  Package,
  User,
  Phone,
  CheckCircle2,
  Ban,
  MoreHorizontal,
} from "lucide-react";

import "./reservations.css";

const API_URL = "http://localhost:5000";

const PAYMENT_METHODS = [
  {
    key: "cash",
    label: "Наличные",
  },
  {
    key: "card",
    label: "Карта",
  },
  {
    key: "amanat",
    label: "Аманат",
  },
  {
    key: "mplus",
    label: "MPlus",
  },
];

const PAYMENT_METHOD_OPTIONS = [
  ...PAYMENT_METHODS,
  {
    key: "mixed",
    label: "Смешанная",
  },
];

const emptyPayments = () => ({
  cash: 0,
  card: 0,
  amanat: 0,
  mplus: 0,
});

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} сом`;
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getTodayString() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startDay = firstDay.getDay();

  // Понедельник = первый день недели
  startDay = startDay === 0 ? 6 : startDay - 1;

  const daysInMonth = lastDay.getDate();

  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function dateToString(date) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDateString(value) {
  if (!value) {
    return "";
  }

  const str = String(value);

  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);

  if (match) {
    return match[1];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getProductPrice(product) {
  if (!product) {
    return 0;
  }

  // Основной вариант из твоего POS
  if (Array.isArray(product.salePrices) && product.salePrices.length > 0) {
    const firstPrice = product.salePrices[0];

    if (typeof firstPrice === "number") {
      return firstPrice;
    }

    if (firstPrice?.value !== undefined) {
      return Number(firstPrice.value) / 100;
    }

    if (firstPrice?.price !== undefined) {
      return Number(firstPrice.price) / 100;
    }
  }

  if (product.salePrice !== undefined) {
    const value = Number(product.salePrice);

    // В МойСклад цена обычно хранится в копейках
    return value > 100000 ? value / 100 : value;
  }

  if (product.price !== undefined) {
    const value = Number(product.price);

    return value > 100000 ? value / 100 : value;
  }

  return 0;
}

function getProductName(product) {
  return product.name || product.title || product.pathName || "Товар";
}

function getProductCode(product) {
  return product.code || product.article || "";
}

function getPaymentMethodLabel(method) {
  const found = PAYMENT_METHOD_OPTIONS.find((item) => item.key === method);

  return found?.label || "Наличные";
}

function getStatusLabel(status) {
  if (status === "issued") {
    return "Выдана";
  }

  if (status === "cancelled") {
    return "Отменена";
  }

  return "Забронирована";
}

function getStatusClass(status) {
  if (status === "issued") {
    return "reservation-status-issued";
  }

  if (status === "cancelled") {
    return "reservation-status-cancelled";
  }

  return "reservation-status-reserved";
}

function getPaymentStatusLabel(status) {
  if (status === "paid") {
    return "Оплачено";
  }

  if (status === "partially_paid") {
    return "Частично оплачено";
  }

  return "Не оплачено";
}

function getPaymentStatusClass(status) {
  if (status === "paid") {
    return "payment-status-paid";
  }

  if (status === "partially_paid") {
    return "payment-status-partial";
  }

  return "payment-status-unpaid";
}

function calculateItemsTotal(items) {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    ),
  );
}

function getInitialPaymentMethod(payments) {
  const activeMethods = PAYMENT_METHODS.filter(
    (method) => Number(payments?.[method.key] || 0) > 0,
  );

  if (activeMethods.length > 1) {
    return "mixed";
  }

  return activeMethods[0]?.key || "cash";
}

function PaymentFields({
  paymentMethod,
  payments,
  onPaymentMethodChange,
  onPaymentChange,
  maxAmount,
  disabled = false,
}) {
  const totalEntered = roundMoney(
    PAYMENT_METHODS.reduce(
      (sum, method) => sum + Number(payments?.[method.key] || 0),
      0,
    ),
  );

  return (
    <div className="payment-box">
      <div className="payment-box-header">
        <div>
          <div className="section-title">Оплата</div>

          <div className="section-description">
            Можно оплатить всю бронь или только часть
          </div>
        </div>

        <CreditCard size={20} />
      </div>

      <div className="payment-method-grid">
        {PAYMENT_METHOD_OPTIONS.map((method) => (
          <button
            key={method.key}
            type="button"
            disabled={disabled}
            className={
              paymentMethod === method.key
                ? "payment-method active"
                : "payment-method"
            }
            onClick={() => onPaymentMethodChange(method.key)}
          >
            {method.label}
          </button>
        ))}
      </div>

      {paymentMethod !== "mixed" ? (
        <div className="payment-input-row">
          <label className="field-label">
            Сумма оплаты
            <input
              type="number"
              min="0"
              step="0.01"
              value={payments?.[paymentMethod] || ""}
              disabled={disabled}
              onChange={(event) =>
                onPaymentChange(paymentMethod, event.target.value)
              }
              placeholder="0"
            />
          </label>
        </div>
      ) : (
        <div className="mixed-payment-grid">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.key} className="field-label">
              {method.label}

              <input
                type="number"
                min="0"
                step="0.01"
                value={payments?.[method.key] || ""}
                disabled={disabled}
                onChange={(event) =>
                  onPaymentChange(method.key, event.target.value)
                }
                placeholder="0"
              />
            </label>
          ))}
        </div>
      )}

      <div className="payment-summary">
        <div>
          <span>Внесено сейчас</span>
          <strong>{formatMoney(totalEntered)}</strong>
        </div>

        <div>
          <span>Максимум</span>
          <strong>{formatMoney(maxAmount)}</strong>
        </div>

        <div>
          <span>Остаток</span>
          <strong>
            {formatMoney(Math.max(0, roundMoney(maxAmount - totalEntered)))}
          </strong>
        </div>
      </div>

      {totalEntered > maxAmount && (
        <div className="form-error">Сумма оплаты больше допустимой суммы.</div>
      )}
    </div>
  );
}

function ProductPicker({ products, items, onAdd, onChangeQuantity, onRemove }) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter((product) => {
      const name = getProductName(product).toLowerCase();
      const code = getProductCode(product).toLowerCase();

      return name.includes(value) || code.includes(value);
    });
  }, [products, search]);

  const getItemQuantity = (productId) => {
    const item = items.find((currentItem) => currentItem.id === productId);

    return item?.quantity || 0;
  };

  return (
    <div className="products-section">
      <div className="products-section-header">
        <div>
          <div className="section-title">Товары</div>

          <div className="section-description">Выберите товары для брони</div>
        </div>

        <div className="product-count">{items.length}</div>
      </div>

      <div className="product-search">
        <Search size={18} />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск товара..."
        />
      </div>

      <div className="product-picker-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-products">Товары не найдены</div>
        ) : (
          filteredProducts.map((product) => {
            const productId = product.id || product.meta?.href || product.name;

            const quantity = getItemQuantity(productId);

            const price = getProductPrice(product);

            return (
              <div
                key={productId}
                className={
                  quantity > 0
                    ? "product-picker-item selected"
                    : "product-picker-item"
                }
              >
                <div className="product-picker-main">
                  <div className="product-icon">
                    <Package size={18} />
                  </div>

                  <div className="product-picker-info">
                    <div className="product-picker-name">
                      {getProductName(product)}
                    </div>

                    <div className="product-picker-meta">
                      {getProductCode(product)
                        ? `Код: ${getProductCode(product)}`
                        : "Без кода"}
                    </div>

                    <div className="product-picker-price">
                      {formatMoney(price)}
                    </div>
                  </div>
                </div>

                {quantity === 0 ? (
                  <button
                    type="button"
                    className="add-product-button"
                    onClick={() => onAdd(product)}
                  >
                    <Plus size={17} />
                    Добавить
                  </button>
                ) : (
                  <div className="quantity-control">
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(productId, quantity - 1)}
                    >
                      −
                    </button>

                    <span>{quantity}</span>

                    <button
                      type="button"
                      onClick={() => onChangeQuantity(productId, quantity + 1)}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      className="quantity-delete"
                      onClick={() => onRemove(productId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReservationFormModal({
  products,
  reservation,
  initialDate,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(reservation);

  const [customerName, setCustomerName] = useState(
    reservation?.customerName || "",
  );

  const [customerPhone, setCustomerPhone] = useState(
    reservation?.customerPhone || "",
  );

  const [reservationDate, setReservationDate] = useState(
    reservation?.reservationDate || initialDate || getTodayString(),
  );

  const [comment, setComment] = useState(reservation?.comment || "");

  const [items, setItems] = useState(reservation?.items || []);

  const [paymentMethod, setPaymentMethod] = useState(
    reservation ? getInitialPaymentMethod(reservation.payments) : "cash",
  );

  const [payments, setPayments] = useState(
    reservation?.payments || emptyPayments(),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(() => calculateItemsTotal(items), [items]);

  const paymentTotal = useMemo(
    () =>
      roundMoney(
        PAYMENT_METHODS.reduce(
          (sum, method) => sum + Number(payments?.[method.key] || 0),
          0,
        ),
      ),
    [payments],
  );

  const remaining = roundMoney(Math.max(0, total - paymentTotal));
  const refundAmount = roundMoney(
    isEdit ? Math.max(0, paymentTotal - total) : 0,
  );

  const addProduct = (product) => {
    const id = product.id || product.meta?.href || product.name;

    const existing = items.find((item) => item.id === id);

    if (existing) {
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        ),
      );

      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        id,
        name: getProductName(product),
        price: roundMoney(getProductPrice(product)),
        quantity: 1,
        type: product.type || "product",
        code: getProductCode(product),
      },
    ]);
  };

  const changeQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));

      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  };

  const removeProduct = (id) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  };

  const handlePaymentMethodChange = (method) => {
    // При редактировании уже внесённый платёж
    // нельзя менять.
    if (isEdit) {
      return;
    }

    setPaymentMethod(method);

    if (method !== "mixed") {
      setPayments({
        ...emptyPayments(),
        [method]: paymentTotal,
      });
    }
  };

  const handlePaymentChange = (method, value) => {
    // При редактировании предоплата уже является
    // фактическим платежом и не должна изменяться.
    if (isEdit) {
      return;
    }

    const numericValue = value === "" ? 0 : Number(value);

    setPayments((currentPayments) => ({
      ...currentPayments,
      [method]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  };

  const saveReservation = async () => {
    setError("");

    if (!customerName.trim()) {
      setError("Введите имя клиента.");
      return;
    }

    if (!customerPhone.trim()) {
      setError("Введите номер телефона.");
      return;
    }

    if (!reservationDate) {
      setError("Выберите дату брони.");
      return;
    }

    if (items.length === 0) {
      setError("Добавьте хотя бы один товар.");
      return;
    }

    if (!isEdit && paymentTotal > total) {
      setError("Сумма оплаты не может быть больше суммы брони.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        customerName,
        customerPhone,
        reservationDate,
        items,
        paymentMethod,
        payments,
        comment,

        // При создании первый платеж = задаток.
        // При редактировании новый платеж НЕ создаём.
        paymentType: isEdit ? null : "deposit",
        refundAmount,
        refundRequired: refundAmount > 0,
      };

      const response = await fetch(
        isEdit
          ? `${API_URL}/api/reservations/${reservation.id}`
          : `${API_URL}/api/reservations`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось сохранить бронь");
      }

      onSaved(data.reservation);
    } catch (err) {
      setError(err.message || "Не удалось сохранить бронь");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="reservation-overlay">
      <div className="reservation-modal reservation-form-modal animate-modal">
        <div className="reservation-modal-header">
          <div>
            <h2>{isEdit ? "Изменить бронь" : "Добавить бронь"}</h2>

            <p>
              {isEdit
                ? `Бронь от ${formatDate(reservation.reservationDate)}`
                : "Создание новой брони"}
            </p>
          </div>

          <button type="button" className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reservation-modal-content">
          <div className="customer-section">
            <div className="section-title">Клиент</div>

            <div className="form-grid">
              <label className="field-label">
                <span>
                  <User size={15} />
                  Имя клиента
                </span>

                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Введите имя"
                />
              </label>

              <label className="field-label">
                <span>
                  <Phone size={15} />
                  Телефон
                </span>

                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+996 ..."
                />
              </label>

              <label className="field-label">
                <span>
                  <CalendarDays size={15} />
                  Дата брони
                </span>

                <input
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                />
              </label>

              <label className="field-label">
                <span>Комментарий</span>

                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Комментарий"
                />
              </label>
            </div>
          </div>

          <ProductPicker
            products={products}
            items={items}
            onAdd={addProduct}
            onChangeQuantity={changeQuantity}
            onRemove={removeProduct}
          />

          <PaymentFields
            paymentMethod={paymentMethod}
            payments={payments}
            onPaymentMethodChange={handlePaymentMethodChange}
            onPaymentChange={handlePaymentChange}
            maxAmount={total}
            disabled={isEdit}
          />

          <div className="reservation-total-box">
            {refundAmount > 0 && (
              <div className="form-warning">
                Возврат клиенту: <strong>{formatMoney(refundAmount)}</strong>
                <div>
                  Новая сумма брони меньше уже внесённой предоплаты. Разница
                  должна быть возвращена клиенту.
                </div>
              </div>
            )}
            <div>
              <span>Товаров</span>
              <strong>
                {items.reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                )}
              </strong>
            </div>

            <div>
              <span>Сумма брони</span>
              <strong>{formatMoney(total)}</strong>
            </div>

            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(paymentTotal)}</strong>
            </div>

            <div>
              <span>Остаток</span>
              <strong
                className={remaining === 0 ? "money-paid" : "money-remaining"}
              >
                {formatMoney(remaining)}
              </strong>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="reservation-modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={saveReservation}
            disabled={saving}
          >
            {saving
              ? "Сохранение..."
              : isEdit
                ? "Сохранить изменения"
                : "Забронировать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationListModal({
  date,
  reservations,
  products,
  onClose,
  onEdit,
  onIssue,
  onCancel,
  onPayment,
}) {
  const [selectedReservation, setSelectedReservation] = useState(null);

  const dateReservations = reservations.filter(
    (reservation) =>
      normalizeDateString(reservation.reservationDate) ===
      normalizeDateString(date),
  );

  return (
    <div className="reservation-overlay">
      <div className="reservation-modal reservations-list-modal animate-modal">
        <div className="reservation-modal-header">
          <div>
            <h2>Все брони</h2>

            <p>
              {formatDate(date)} · {dateReservations.length}{" "}
              {dateReservations.length === 1 ? "бронь" : "брони"}
            </p>
          </div>

          <button type="button" className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reservation-modal-content">
          {dateReservations.length === 0 ? (
            <div className="empty-state">На эту дату броней нет.</div>
          ) : (
            <div className="reservations-list">
              {dateReservations.map((reservation) => {
                const isSelected = selectedReservation?.id === reservation.id;

                return (
                  <div
                    key={reservation.id}
                    className={`reservation-list-card ${getStatusClass(
                      reservation.status,
                    )}`}
                  >
                    <div className="reservation-list-top">
                      <div>
                        <div className="reservation-customer">
                          <User size={17} />

                          {reservation.customerName || "Без имени"}
                        </div>

                        {reservation.customerPhone && (
                          <div className="reservation-phone">
                            <Phone size={14} />

                            {reservation.customerPhone}
                          </div>
                        )}
                      </div>

                      <div className="reservation-badges">
                        <span
                          className={`reservation-status ${getStatusClass(
                            reservation.status,
                          )}`}
                        >
                          {getStatusLabel(reservation.status)}
                        </span>

                        <span
                          className={`payment-status ${getPaymentStatusClass(
                            reservation.paymentStatus,
                          )}`}
                        >
                          {getPaymentStatusLabel(reservation.paymentStatus)}
                        </span>
                      </div>
                    </div>

                    <div className="reservation-items">
                      {reservation.items.map((item) => (
                        <div className="reservation-item" key={item.id}>
                          <span>{item.name}</span>

                          <span>
                            {item.quantity} × {formatMoney(item.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="reservation-finance">
                      <div>
                        <span>Сумма</span>
                        <strong>{formatMoney(reservation.total)}</strong>
                      </div>

                      <div>
                        <span>Оплачено</span>
                        <strong>{formatMoney(reservation.paid)}</strong>
                      </div>

                      <div>
                        <span>Остаток</span>
                        <strong
                          className={
                            reservation.remaining === 0
                              ? "money-paid"
                              : "money-remaining"
                          }
                        >
                          {formatMoney(reservation.remaining)}
                        </strong>
                      </div>
                    </div>

                    {reservation.comment && (
                      <div className="reservation-comment">
                        <strong>Комментарий:</strong> {reservation.comment}
                      </div>
                    )}

                    <div className="reservation-actions">
                      {reservation.status !== "issued" &&
                        reservation.status !== "cancelled" && (
                          <>
                            {reservation.remaining > 0 && (
                              <button
                                type="button"
                                className="payment-action-button"
                                onClick={() =>
                                  setSelectedReservation(
                                    isSelected ? null : reservation,
                                  )
                                }
                              >
                                <CreditCard size={16} />
                                Внести оплату
                              </button>
                            )}

                            <button
                              type="button"
                              className="edit-action-button"
                              onClick={() => onEdit(reservation)}
                            >
                              <Pencil size={16} />
                              Изменить
                            </button>

                            <button
                              type="button"
                              className="cancel-action-button"
                              onClick={() => onCancel(reservation)}
                            >
                              <Ban size={16} />
                              Отменить
                            </button>
                          </>
                        )}

                      {reservation.status !== "cancelled" && (
                        <button
                          type="button"
                          disabled={
                            reservation.remaining > 0 ||
                            reservation.status === "issued"
                          }
                          className="issue-action-button"
                          onClick={() => onIssue(reservation)}
                        >
                          <CheckCircle2 size={16} />

                          {reservation.remaining > 0
                            ? `Не оплачено полностью · остаток ${formatMoney(
                                reservation.remaining,
                              )}`
                            : reservation.status === "issued"
                              ? "Выдана"
                              : "Выдать бронь"}
                        </button>
                      )}
                    </div>

                    {isSelected && reservation.remaining > 0 && (
                      <PaymentEditor
                        reservation={reservation}
                        onPayment={onPayment}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentEditor({ reservation, onPayment }) {
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [payments, setPayments] = useState(emptyPayments());

  const entered = roundMoney(
    PAYMENT_METHODS.reduce(
      (sum, method) => sum + Number(payments[method.key] || 0),
      0,
    ),
  );

  const remaining = roundMoney(reservation.remaining);

  const changeMethod = (method) => {
    setPaymentMethod(method);

    setPayments({
      ...emptyPayments(),
      [method]: entered,
    });
  };

  const changePayment = (method, value) => {
    const numericValue = value === "" ? 0 : Number(value);

    setPayments((current) => ({
      ...current,
      [method]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  };

  const submit = () => {
    if (entered <= 0) {
      return;
    }

    // Второй платёж должен закрывать
    // весь оставшийся долг.
    if (entered !== remaining) {
      return;
    }

    onPayment(reservation, paymentMethod, payments);
  };

  const isExactPayment = entered > 0 && entered === remaining;

  return (
    <div className="remaining-payment-editor">
      <div className="remaining-payment-title">Внести остаток</div>

      <div className="payment-method-grid">
        {PAYMENT_METHOD_OPTIONS.map((method) => (
          <button
            key={method.key}
            type="button"
            className={
              paymentMethod === method.key
                ? "payment-method active"
                : "payment-method"
            }
            onClick={() => changeMethod(method.key)}
          >
            {method.label}
          </button>
        ))}
      </div>

      {paymentMethod !== "mixed" ? (
        <label className="field-label">
          Сумма
          <input
            type="number"
            min="0"
            step="0.01"
            value={payments[paymentMethod] || ""}
            onChange={(event) =>
              changePayment(paymentMethod, event.target.value)
            }
          />
        </label>
      ) : (
        <div className="mixed-payment-grid">
          {PAYMENT_METHODS.map((method) => (
            <label key={method.key} className="field-label">
              {method.label}

              <input
                type="number"
                min="0"
                step="0.01"
                value={payments[method.key] || ""}
                onChange={(event) =>
                  changePayment(method.key, event.target.value)
                }
              />
            </label>
          ))}
        </div>
      )}

      {entered > 0 && !isExactPayment && (
        <div className="form-error">
          Для второго платежа необходимо внести весь остаток:{" "}
          {formatMoney(remaining)}
        </div>
      )}

      <div className="remaining-payment-footer">
        <div>
          Остаток после оплаты:{" "}
          <strong>{formatMoney(Math.max(0, remaining - entered))}</strong>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!isExactPayment}
          onClick={submit}
        >
          Внести полный выкуп
        </button>
      </div>
    </div>
  );
}

function ReservationPreviewModal({ reservation, onClose, onEdit, onIssue }) {
  return (
    <div className="reservation-overlay">
      <div className="reservation-modal preview-modal animate-modal">
        <div className="reservation-modal-header">
          <div>
            <h2>Бронь</h2>

            <p>{formatDate(reservation.reservationDate)}</p>
          </div>

          <button type="button" className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reservation-modal-content">
          <div className="preview-customer">
            <div className="preview-customer-icon">
              <User size={20} />
            </div>

            <div>
              <strong>{reservation.customerName || "Без имени"}</strong>

              {reservation.customerPhone && (
                <span>{reservation.customerPhone}</span>
              )}
            </div>
          </div>

          <div className="preview-items">
            {reservation.items.map((item) => (
              <div className="preview-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>

                  <span>
                    {item.quantity} × {formatMoney(item.price)}
                  </span>
                </div>

                <strong>{formatMoney(item.quantity * item.price)}</strong>
              </div>
            ))}
          </div>

          <div className="preview-finance">
            <div>
              <span>Сумма</span>
              <strong>{formatMoney(reservation.total)}</strong>
            </div>

            <div>
              <span>Оплачено</span>
              <strong>{formatMoney(reservation.paid)}</strong>
            </div>

            <div>
              <span>Остаток</span>
              <strong
                className={
                  reservation.remaining === 0 ? "money-paid" : "money-remaining"
                }
              >
                {formatMoney(reservation.remaining)}
              </strong>
            </div>
          </div>

          <div className="preview-payment-info">
            <span>Способ оплаты</span>

            <strong>{getPaymentMethodLabel(reservation.paymentMethod)}</strong>
          </div>

          {reservation.comment && (
            <div className="preview-comment">
              <span>Комментарий</span>
              <p>{reservation.comment}</p>
            </div>
          )}

          <div
            className={`preview-status ${getStatusClass(reservation.status)}`}
          >
            {getStatusLabel(reservation.status)}
          </div>
        </div>

        <div className="reservation-modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Закрыть
          </button>

          {reservation.status === "reserved" && (
            <>
              <button
                type="button"
                className="edit-action-button large"
                onClick={() => onEdit(reservation)}
              >
                <Pencil size={17} />
                Изменить
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={reservation.remaining > 0}
                onClick={() => onIssue(reservation)}
              >
                <CheckCircle2 size={17} />
                {reservation.remaining > 0
                  ? "Сначала оплатить"
                  : "Выдать бронь"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Reservations({
  products,
  loading: productsLoading,
  error: productsError,
  onRefreshProducts,
  onBack,
}) {
  const [currentMonth, setCurrentMonth] = useState(getMonthStart(new Date()));

  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(getTodayString());

  const [editingReservation, setEditingReservation] = useState(null);

  const [listDate, setListDate] = useState(null);

  const [previewReservation, setPreviewReservation] = useState(null);

  const calendarDays = getCalendarDays(currentMonth);

  const loadReservations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/reservations`);

      const data = await response.json();

      console.log("RESERVATIONS RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить брони");
      }

      // Backend может вернуть:
      // 1. напрямую массив
      // 2. { success: true, rows: [...] }
      // 3. { success: true, reservations: [...] }
      let rows = [];

      if (Array.isArray(data)) {
        rows = data;
      } else if (Array.isArray(data.rows)) {
        rows = data.rows;
      } else if (Array.isArray(data.reservations)) {
        rows = data.reservations;
      }

      console.log("Брони для календаря:", rows);

      const normalizedRows = rows.map((reservation) => ({
        ...reservation,

        reservationDate: normalizeDateString(reservation.reservationDate),
      }));

      console.log("Нормализованные брони:", normalizedRows);

      setReservations(normalizedRows);
    } catch (err) {
      console.error("Ошибка загрузки броней:", err);

      setError(err.message || "Не удалось загрузить брони");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const reservationsByDate = useMemo(() => {
    const result = {};

    reservations.forEach((reservation) => {
      const dateString = normalizeDateString(reservation.reservationDate);

      if (!dateString) {
        return;
      }

      if (!result[dateString]) {
        result[dateString] = [];
      }

      result[dateString].push(reservation);
    });

    return result;
  }, [reservations]);

  const openCreate = (date) => {
    setEditingReservation(null);
    setFormDate(date);
    setFormOpen(true);
  };

  const openEdit = (reservation) => {
    setPreviewReservation(null);
    setListDate(null);
    setEditingReservation(reservation);
    setFormDate(reservation.reservationDate);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditingReservation(null);
    loadReservations();
  };

  const handleIssue = async (reservation) => {
    if (reservation.remaining > 0) {
      setPreviewReservation(null);
      setListDate(reservation.reservationDate);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${reservation.id}/issue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось выдать бронь");
      }

      setPreviewReservation(null);
      await loadReservations();
    } catch (err) {
      setError(err.message || "Не удалось выдать бронь");
    }
  };

  const handleCancel = async (reservation) => {
    const confirmed = window.confirm(
      `Отменить бронь клиента "${reservation.customerName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${reservation.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось отменить бронь");
      }

      await loadReservations();
    } catch (err) {
      setError(err.message || "Не удалось отменить бронь");
    }
  };

  const handlePayment = async (reservation, paymentMethod, payments) => {
    const amount = roundMoney(
      PAYMENT_METHODS.reduce(
        (sum, method) => sum + Number(payments?.[method.key] || 0),
        0,
      ),
    );

    if (amount <= 0) {
      return;
    }

    // Второй платеж должен полностью
    // закрыть оставшуюся сумму.
    if (amount !== roundMoney(reservation.remaining)) {
      setError(
        `Для полного выкупа необходимо внести ${formatMoney(
          reservation.remaining,
        )}.`,
      );

      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/reservations/${reservation.id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod,
            payments,

            // Это именно второй и последний
            // платеж по броне.
            paymentType: "final",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось внести оплату");
      }

      await loadReservations();
    } catch (err) {
      setError(err.message || "Не удалось внести оплату");
    }
  };

  const monthTitle = currentMonth.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="reservations-page">
      <div className="reservations-container">
        <div className="reservations-header">
          <div className="reservations-title-block">
            <button type="button" className="back-button" onClick={onBack}>
              <ChevronLeft size={18} />
              Назад
            </button>

            <div>
              <h1>
                <CalendarDays size={30} />
                Брони
              </h1>

              <p>Бронирование товаров и управление выдачей</p>
            </div>
          </div>

          <div className="reservations-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={loadReservations}
              disabled={loading}
            >
              Обновить
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => openCreate(getTodayString())}
            >
              <Plus size={18} />
              Добавить бронь
            </button>
          </div>
        </div>

        {error && (
          <div className="page-error">
            {error}

            <button type="button" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        {productsError && (
          <div className="page-warning">
            Не удалось загрузить товары МойСклад.
            <button type="button" onClick={onRefreshProducts}>
              Повторить
            </button>
          </div>
        )}

        <div className="calendar-card">
          <div className="calendar-header">
            <div className="calendar-month">{monthTitle}</div>

            <div className="calendar-navigation">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() - 1,
                        1,
                      ),
                  )
                }
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                className="today-button"
                onClick={() => setCurrentMonth(getMonthStart(new Date()))}
              >
                Сегодня
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + 1,
                        1,
                      ),
                  )
                }
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div key={`empty-${index}`} className="calendar-day empty" />
                );
              }

              const dateString = dateToString(date);

              const dayReservations = reservationsByDate[dateString] || [];

              const visibleReservations = dayReservations.slice(0, 3);

              const additionalCount = Math.max(0, dayReservations.length - 3);

              const isToday = dateString === getTodayString();

              return (
                <div
                  key={dateString}
                  className={isToday ? "calendar-day today" : "calendar-day"}
                >
                  <div className="calendar-day-header">
                    <span className="calendar-day-number">
                      {date.getDate()}
                    </span>

                    {dayReservations.length > 0 && (
                      <span className="day-count">
                        {dayReservations.length}
                      </span>
                    )}
                  </div>

                  <div className="day-reservations">
                    {visibleReservations.map((reservation) => (
                      <button
                        type="button"
                        key={reservation.id}
                        className={`calendar-reservation ${getStatusClass(
                          reservation.status,
                        )}`}
                        onClick={() => setPreviewReservation(reservation)}
                      >
                        <div className="calendar-reservation-name">
                          {reservation.customerName || "Без имени"}
                        </div>

                        <div className="calendar-reservation-money">
                          {formatMoney(reservation.total)}
                        </div>
                      </button>
                    ))}

                    {additionalCount > 0 && (
                      <button
                        type="button"
                        className="more-reservations"
                        onClick={() => setListDate(dateString)}
                      >
                        <MoreHorizontal size={15} />+ ещё {additionalCount}
                      </button>
                    )}
                  </div>

                  <div className="calendar-day-footer">
                    <button
                      type="button"
                      className="day-add-button"
                      onClick={() => openCreate(dateString)}
                    >
                      <Plus size={15} />
                      Добавить бронь
                    </button>

                    {dayReservations.length > 0 && (
                      <button
                        type="button"
                        className="day-all-button"
                        onClick={() => setListDate(dateString)}
                      >
                        Все брони
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="calendar-legend">
          <div>
            <span className="legend-dot reserved" />
            Забронирована
          </div>

          <div>
            <span className="legend-dot issued" />
            Выдана
          </div>

          <div>
            <span className="legend-dot cancelled" />
            Отменена
          </div>
        </div>
      </div>

      {formOpen && (
        <ReservationFormModal
          products={products}
          reservation={editingReservation}
          initialDate={formDate}
          onClose={() => {
            setFormOpen(false);
            setEditingReservation(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {listDate && (
        <ReservationListModal
          date={listDate}
          reservations={reservations}
          products={products}
          onClose={() => setListDate(null)}
          onEdit={openEdit}
          onIssue={handleIssue}
          onCancel={handleCancel}
          onPayment={handlePayment}
        />
      )}

      {previewReservation && (
        <ReservationPreviewModal
          reservation={previewReservation}
          onClose={() => setPreviewReservation(null)}
          onEdit={openEdit}
          onIssue={handleIssue}
        />
      )}

      {productsLoading && (
        <div className="products-loading-indicator">Загрузка товаров...</div>
      )}
    </div>
  );
}

export default Reservations;
