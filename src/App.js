import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  Package,
  Truck,
  CreditCard,
  RotateCcw,
  RefreshCw,
  X,
  FileStack,
  CircleDollarSign,
  RotateCcwClock,
  Van,
} from "lucide-react";

import Cashier from "./Cashier";
import Return from "./Return";
import Reservations from "./Reservations";
import Expenses from "./Expenses";
import Transfers from "./Transfers";
import SalesHistory from "./SalesHistory";
import Collection from "./Collection";
import Amanat from "./Amanat";
import Reports from "./Reports";
const STORE_ID = "40b43662-2117-11f1-0a80-1cb200302c3c";

const SHIFT_STORAGE_KEY = "moysklad_retail_shift_id";

const injectEmbeddedStyles = () => {
  if (document.getElementById("moysklad-pos-embedded-css")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "moysklad-pos-embedded-css";

  style.innerHTML = `
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }

    button,
    input {
      font-family: inherit;
    }

    button {
      cursor: pointer;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .animate-modal {
      animation: modalIn 0.2s ease-out;
    }
  `;

  document.head.appendChild(style);
};

function App() {
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isAmanatOpen, setIsAmanatOpen] = useState(false);
  const [useMockApi, setUseMockApi] = useState(false);
  const [isReservationsOpen, setIsReservationsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Состояние кассовой смены
  const [isShiftOpen, setIsShiftOpen] = useState(() => {
    return Boolean(localStorage.getItem(SHIFT_STORAGE_KEY));
  });

  const [shiftLoading, setShiftLoading] = useState(false);

  useEffect(() => {
    injectEmbeddedStyles();
  }, []);

  /**
   * Загрузка товаров
   */
  const fetchMoySkladProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/moysklad/products?storeId=${STORE_ID}`,
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.message || "Не удалось загрузить товары");
      }

      const data = await response.json();

      console.log("Товары МойСклад:", data);

      setProducts(data.rows || []);
    } catch (err) {
      console.error("MoySklad error:", err);

      setError(err.message || "Не удалось загрузить товары МойСклад");

      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoySkladProducts();
  }, []);

  /**
   * Открытие смены
   *
   * Backend сам:
   * - получает POS token
   * - получает cashier UID
   * - создаёт retailShiftSyncId
   * - открывает смену
   *
   * Frontend сохраняет только ID смены.
   */
  const openCashShift = async () => {
    if (shiftLoading) {
      return;
    }

    setShiftLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/moysklad/retail-shift/open",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось открыть смену");
      }

      if (!data.retailShiftSyncId) {
        throw new Error("МойСклад не вернул идентификатор смены");
      }

      // Сохраняем ID смены
      localStorage.setItem(SHIFT_STORAGE_KEY, data.retailShiftSyncId);

      // Меняем интерфейс
      setIsShiftOpen(true);

      console.log("Смена открыта:", data);

      return data;
    } catch (err) {
      console.error("Ошибка открытия смены:", err);

      setError(err.message || "Не удалось открыть смену");

      throw err;
    } finally {
      setShiftLoading(false);
    }
  };

  /**
   * Закрытие смены
   */
  const closeCashShift = async () => {
    if (shiftLoading) {
      return;
    }

    const retailShiftSyncId = localStorage.getItem(SHIFT_STORAGE_KEY);

    if (!retailShiftSyncId) {
      setIsShiftOpen(false);

      setError("Нет открытой смены");

      return;
    }

    setShiftLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "http://localhost:5000/api/moysklad/retail-shift/close",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            retailShiftSyncId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось закрыть смену");
      }

      // Удаляем ID только после успешного закрытия
      localStorage.removeItem(SHIFT_STORAGE_KEY);

      // Меняем интерфейс
      setIsShiftOpen(false);

      console.log("Смена закрыта:", data);

      return data;
    } catch (err) {
      console.error("Ошибка закрытия смены:", err);

      setError(err.message || "Не удалось закрыть смену");

      throw err;
    } finally {
      setShiftLoading(false);
    }
  };

  const handleShiftClick = async () => {
    try {
      if (isShiftOpen) {
        await closeCashShift();
      } else {
        await openCashShift();
      }
    } catch (err) {
      // Ошибка уже записана в state
      console.error(err);
    }
  };

  const handleOpenCashier = () => {
    setIsCashierOpen(true);
    fetchMoySkladProducts();
  };

  const handleOpenReturn = () => {
    setIsReturnOpen(true);
    fetchMoySkladProducts();
  };

  const cards = [
    {
      title: "Продажа",
      description: "Продажа товаров",
      icon: ShoppingCart,
      onClick: handleOpenCashier,
    },
    {
      title: "Бронь",
      description: "Бронирование товаров",
      icon: Package,
      onClick: () => {
        setIsReservationsOpen(true);
        fetchMoySkladProducts();
      },
    },
    {
      title: "Отправка/Приход",
      description: "Отправка товаров/Поступление товаров",
      icon: Truck,
      onClick: () => setActiveTab("Отправка/Приход"),
    },
    {
      title: "Возврат",
      description: "Возврат товаров",
      icon: RotateCcw,
      onClick: handleOpenReturn,
    },
    {
      title: "Расходы",
      description: "Управление расходами",
      icon: CreditCard,
      onClick: () => setActiveTab("Расходы"),
    },
    {
      title: "История продаж",
      description: "История продаж",
      icon: RotateCcwClock,
      onClick: () => setActiveTab("История продаж"),
    },
    {
      title: "Инкассация",
      description: "Инкассация",
      icon: CircleDollarSign,
      onClick: () => setActiveTab("Инкассация"),
    },
    {
      title: "Отчет",
      description: "Отчет по продажам",
      icon: FileStack,
      onClick: () => setActiveTab("Отчет"),
    },
    {
      title: "Аманат",
      description: "Таблица задолженности аманата",
      icon: Van,
      onClick: () => setIsAmanatOpen(true),
    },
  ];

  if (isReservationsOpen) {
    return (
      <Reservations
        products={products}
        loading={loading}
        error={error}
        onRefreshProducts={fetchMoySkladProducts}
        onBack={() => setIsReservationsOpen(false)}
      />
    );
  }
  if (activeTab === "Отчет") {
    return <Reports onBack={() => setActiveTab(null)} />;
  }
  if (isAmanatOpen) {
    return <Amanat onBack={() => setIsAmanatOpen(false)} />;
  }

  if (activeTab === "Отправка/Приход") {
    return <Transfers onBack={() => setActiveTab(null)} />;
  }

  if (activeTab === "Расходы") {
    return <Expenses onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === "История продаж") {
    return <SalesHistory onBack={() => setActiveTab(null)} />;
  }
  if (activeTab === "Инкассация") {
    return <Collection onBack={() => setActiveTab(null)} />;
  }

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
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              МойСклад POS
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              Управление продажами и товарами
            </p>
          </div>

          {/* КНОПКА СМЕНЫ */}
          <button
            onClick={handleShiftClick}
            disabled={shiftLoading}
            style={{
              minWidth: "160px",
              height: "44px",
              padding: "0 16px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: isShiftOpen ? "#fee2e2" : "#fff",
              color: isShiftOpen ? "#b91c1c" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 650,
              opacity: shiftLoading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={17}
              style={{
                animation: shiftLoading ? "spin 1s linear infinite" : "none",
              }}
            />

            {shiftLoading
              ? "Обработка..."
              : isShiftOpen
                ? "Закрыть смену"
                : "Открыть смену"}
          </button>
        </div>

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
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <span>{error}</span>

            <button
              onClick={fetchMoySkladProducts}
              style={{
                border: "none",
                background: "transparent",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 600,
              }}
            >
              <RefreshCw size={16} />
              Повторить
            </button>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.title}
                onClick={card.onClick}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  borderRadius: "20px",
                  padding: "28px",
                  minHeight: "180px",
                  textAlign: "left",
                  transition: "all .2s ease",
                  boxShadow: "0 4px 20px rgba(15,23,42,.04)",
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
                    marginBottom: "22px",
                  }}
                >
                  <Icon size={25} />
                </div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 750,
                    color: "#0f172a",
                  }}
                >
                  {card.title}
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "14px",
                    color: "#64748b",
                  }}
                >
                  {card.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Cashier
        isOpen={isCashierOpen}
        products={products}
        loading={loading}
        error={error}
        onRefresh={fetchMoySkladProducts}
        onClose={() => setIsCashierOpen(false)}
      />

      {isReturnOpen && (
        <Return
          products={products}
          loading={loading}
          error={error}
          onClose={() => setIsReturnOpen(false)}
          onRefresh={fetchMoySkladProducts}
        />
      )}

      {isSettingsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15,23,42,.65)",
            backdropFilter: "blur(6px)",
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
              maxWidth: "500px",
              background: "#fff",
              borderRadius: "20px",
              padding: "24px",
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
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                Настройки
              </h2>

              <button
                onClick={() => setIsSettingsOpen(false)}
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

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 650,
                  }}
                >
                  Тестовый режим
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  Использовать тестовые данные
                </div>
              </div>

              <input
                type="checkbox"
                checked={useMockApi}
                onChange={(e) => setUseMockApi(e.target.checked)}
              />
            </label>

            <button
              onClick={() => {
                setIsSettingsOpen(false);
                fetchMoySkladProducts();
              }}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "13px",
                border: "none",
                borderRadius: "10px",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 650,
              }}
            >
              Обновить товары
            </button>
          </div>
        </div>
      )}

      {activeTab && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(15,23,42,.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="animate-modal"
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "500px",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2 style={{ margin: 0 }}>{activeTab}</h2>

              <button
                onClick={() => setActiveTab(null)}
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

            <p
              style={{
                color: "#64748b",
                marginTop: "20px",
              }}
            >
              Раздел находится в разработке.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
