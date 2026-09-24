import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Plus,
  Minus,
  History,
  Lock,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function formatMoney(value) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function Collection({ onBack }) {
  const [cashBalance, setCashBalance] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [amount, setAmount] = useState("");
  const [responsible, setResponsible] = useState("");
  const [actionType, setActionType] = useState(null);

  const [transactions, setTransactions] = useState([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  /**
   * Загрузка текущего остатка кассы
   */
  const fetchCashBalance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/moysklad/cash/balance`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось получить остаток кассы");
      }

      setCashBalance(Number(data.balance || 0));
      await fetchTransactions(false);
    } catch (err) {
      console.error("Ошибка получения остатка кассы:", err);

      setError(err.message || "Не удалось получить остаток кассы");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Загрузка истории
   *
   * 
   */
  const fetchTransactions = async (openHistory = false) => {
    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/moysklad/cash/transactions`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось получить историю");
      }

      setTransactions(data.transactions || []);

      if (openHistory) {
        setIsHistoryOpen(true);
      }
    } catch (err) {
      console.error("Ошибка получения истории:", err);

      setError(err.message || "Не удалось получить историю транзакций");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchCashBalance();
  }, []);

  /**
   * Открытие окна операции
   */
  const openAction = (type) => {
    setActionType(type);
    setAmount("");
    setResponsible("");
    setError("");
    setSuccess("");
  };

  /**
   * Закрытие окна операции
   */
  const closeAction = () => {
    if (actionLoading) {
      return;
    }

    // fetchTransactions(false)
    setActionType(null);
    setAmount("");
    setResponsible("");
  };

  /**
   * Выполнение операции
   */
  const handleCashAction = async () => {
    if (actionLoading) {
      return;
    }

    setError("");
    setSuccess("");

    const numericAmount = Number(String(amount).replace(",", "."));

    if (!numericAmount || numericAmount <= 0) {
      setError("Введите корректную сумму");
      return;
    }

    if (!responsible.trim()) {
      setError("Введите имя ответственного");
      return;
    }

    if (actionType === "withdraw" && numericAmount > cashBalance) {
      setError("Недостаточно денег на кассе");
      return;
    }

    setActionLoading(true);

    try {
      const endpoint =
        actionType === "deposit"
          ? `${API_URL}/api/moysklad/cash/deposit`
          : `${API_URL}/api/moysklad/cash/withdraw`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numericAmount,
          responsible: responsible.trim(),
          comment:
            actionType === "deposit"
              ? "Занесение денег в кассу"
              : "Забор денег из кассы",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось выполнить операцию");
      }

      /**
       * Backend должен вернуть новый balance.
       */
      setCashBalance(Number(data.balance || 0));

      setSuccess(
        actionType === "deposit"
          ? `В кассу внесено ${formatMoney(numericAmount)} сом`
          : `Из кассы забрано ${formatMoney(numericAmount)} сом`,
      );

      setAmount("");

      setTimeout(() => {
        setActionType(null);
        setSuccess("");
      }, 1200);
    } catch (err) {
      console.error("Ошибка операции:", err);

      setError(err.message || "Не удалось выполнить операцию");
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Открытие истории
   */
  const handleHistoryClick = async () => {
    if (isHistoryOpen) {
      setIsHistoryOpen(false);
      return;
    }

    await fetchTransactions(true);
  };

  /**
   * Проверка пароля
   */

  /**
   * Формат даты
   */
  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <button
              onClick={onBack}
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Инкассация
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Управление наличными деньгами кассы
              </p>
            </div>
          </div>

          <button
            onClick={fetchCashBalance}
            disabled={loading}
            style={{
              height: "44px",
              padding: "0 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#fff",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={17}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            Обновить
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <AlertCircle size={18} />

            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <CheckCircle2 size={18} />

            <span>{success}</span>
          </div>
        )}

        {/* BALANCE */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            padding: "28px",
            marginBottom: "20px",
            boxShadow: "0 4px 20px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Banknote size={26} />
            </div>

            <div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                }}
              >
                Количество денег на кассе
              </div>

              <div
                style={{
                  marginTop: "4px",
                  fontSize: "34px",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {loading ? "Загрузка..." : `${formatMoney(cashBalance)} сом`}
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          {/* DEPOSIT */}
          <button
            onClick={() => openAction("deposit")}
            style={{
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              borderRadius: "20px",
              padding: "26px",
              minHeight: "150px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "13px",
                background: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              <ArrowDownToLine size={24} />
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: 750,
                color: "#166534",
              }}
            >
              Занести деньги
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "#4d7c5a",
                fontSize: "14px",
              }}
            >
              Добавить наличные в кассу
            </div>
          </button>

          {/* WITHDRAW */}
          <button
            onClick={() => openAction("withdraw")}
            style={{
              border: "1px solid #fecaca",
              background: "#fef2f2",
              borderRadius: "20px",
              padding: "26px",
              minHeight: "150px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "13px",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              <ArrowUpFromLine size={24} />
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: 750,
                color: "#991b1b",
              }}
            >
              Забрать деньги
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "#9f5d5d",
                fontSize: "14px",
              }}
            >
              Забрать наличные из кассы
            </div>
          </button>

          {/* HISTORY */}
          <button
            onClick={handleHistoryClick}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: "20px",
              padding: "26px",
              minHeight: "150px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "13px",
                background: "#f1f5f9",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              <History size={23} />
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: 750,
                color: "#0f172a",
              }}
            >
              История транзакций
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Просмотр операций кассы
            </div>
          </button>
        </div>

        {/* HISTORY */}
        {isHistoryOpen && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <History size={20} />

                <h2
                  style={{
                    margin: 0,
                    fontSize: "20px",
                  }}
                >
                  История транзакций
                </h2>
              </div>

              <button
                onClick={() => setIsHistoryOpen(false)}
                style={{
                  width: "36px",
                  height: "36px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div
                style={{
                  padding: "50px 20px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                История транзакций пуста
              </div>
            ) : (
              <div>
                {transactions.map((transaction, index) => {
                  const isDeposit = transaction.type === "deposit";

                  return (
                    <div
                      key={transaction.id || transaction._id || index}
                      style={{
                        padding: "18px 24px",
                        borderBottom:
                          index !== transactions.length - 1
                            ? "1px solid #f1f5f9"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: isDeposit ? "#f0fdf4" : "#fef2f2",
                            color: isDeposit ? "#16a34a" : "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isDeposit ? <Plus size={20} /> : <Minus size={20} />}
                        </div>

                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {isDeposit ? "Занесение денег" : "Забор денег"}
                          </div>

                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "13px",
                              color: "#64748b",
                            }}
                          >
                            {formatDate(
                              transaction.createdAt || transaction.date,
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: 750,
                            color: isDeposit ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {isDeposit ? "+" : "-"}
                          {formatMoney(transaction.amount)} сом
                        </div>

                        {transaction.responsible && (
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "13px",
                              color: "#334155",
                              fontWeight: 600,
                            }}
                          >
                            Ответственный: {transaction.responsible}
                          </div>
                        )}

                        {transaction.comment && (
                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            {transaction.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ACTION MODAL */}
      {actionType && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15,23,42,.65)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="animate-modal"
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "#fff",
              borderRadius: "20px",
              padding: "26px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                  }}
                >
                  {actionType === "deposit"
                    ? "Занести деньги"
                    : "Забрать деньги"}
                </h2>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Сейчас в кассе:{" "}
                  <strong>{formatMoney(cashBalance)} сом</strong>
                </div>
              </div>

              <button
                onClick={closeAction}
                disabled={actionLoading}
                style={{
                  width: "36px",
                  height: "36px",
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: 650,
                color: "#334155",
              }}
            >
              Ответственный
            </label>

            <input
              type="text"
              value={responsible}
              onChange={(e) => {
                setResponsible(e.target.value);
                setError("");
              }}
              placeholder={
                actionType === "deposit"
                  ? "Кто принял деньги"
                  : "Кто забрал деньги"
              }
              disabled={actionLoading}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 14px",
                marginBottom: "18px",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                outline: "none",
                fontSize: "15px",
                color: "#0f172a",
              }}
            />

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;

                  if (/^[0-9]*([.,][0-9]{0,2})?$/.test(value)) {
                    setAmount(value);
                    setError("");
                  }
                }}
                placeholder="0"
                autoFocus
                disabled={actionLoading}
                style={{
                  width: "100%",
                  height: "58px",
                  padding: "0 80px 0 16px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  outline: "none",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              />

              <span
                style={{
                  position: "absolute",
                  right: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                сом
              </span>
            </div>

            <button
              onClick={handleCashAction}
              disabled={
                actionLoading ||
                !amount ||
                !responsible.trim() ||
                Number(String(amount).replace(",", ".")) <= 0
              }
              style={{
                width: "100%",
                height: "50px",
                marginTop: "20px",
                border: "none",
                borderRadius: "12px",
                background: actionType === "deposit" ? "#16a34a" : "#dc2626",
                color: "#fff",
                fontWeight: 700,
                fontSize: "15px",
                opacity:
                  actionLoading ||
                  !amount ||
                  !responsible.trim() ||
                  Number(String(amount).replace(",", ".")) <= 0
                    ? 0.5
                    : 1,
              }}
            >
              {actionLoading
                ? "Обработка..."
                : actionType === "deposit"
                  ? "Занести деньги"
                  : "Забрать деньги"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collection;
