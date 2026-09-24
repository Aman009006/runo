import React, { useMemo, useState } from "react";
import {
  RotateCcw,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Package,
  Banknote,
  CreditCard,
} from "lucide-react";
import API_URL from "./config.js";


function Return({ products, loading, error, onClose, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [returnCart, setReturnCart] = useState([]);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnError, setReturnError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Способ возврата
  const [returnPaymentMethod, setReturnPaymentMethod] = useState("cash");

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("ru-RU", {
      style: "currency",
      currency: "SOM",
      maximumFractionDigits: 0,
    });
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (!q) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(q) ||
        product.code?.toLowerCase().includes(q) ||
        product.article?.toLowerCase().includes(q) ||
        (product.barcodes &&
          product.barcodes.some((barcode) =>
            Object.values(barcode).some((value) =>
              String(value).toLowerCase().includes(q),
            ),
          ))
      );
    });
  }, [products, searchQuery]);

  const addToReturn = (product) => {
    setReturnError(null);

    setReturnCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          ...product,
          qty: 1,
        },
      ];
    });
  };

  const updateQuantity = (id, delta) => {
    setReturnCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) {
            return item;
          }

          const newQty = item.qty + delta;

          return newQty > 0
            ? {
                ...item,
                qty: newQty,
              }
            : null;
        })
        .filter(Boolean),
    );

    setReturnError(null);
  };

  const removeFromReturn = (id) => {
    setReturnCart((prev) => prev.filter((item) => item.id !== id));

    setReturnError(null);
  };

  const clearReturnCart = () => {
    setReturnCart([]);
    setReturnError(null);
  };

  const total = useMemo(() => {
    return returnCart.reduce((sum, item) => {
      return sum + Number(item.price || 0) * item.qty;
    }, 0);
  }, [returnCart]);

  const handleReturn = async () => {
    if (returnCart.length === 0) {
      setReturnError("Добавьте хотя бы один товар для возврата");
      return;
    }

    if (total <= 0) {
      setReturnError("Сумма возврата должна быть больше 0");
      return;
    }

    setReturnLoading(true);
    setReturnError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/moysklad/returns`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: returnCart.map((item) => ({
              id: item.id,
              quantity: item.qty,
              price: Number(item.price || 0),
            })),

            total,

            retailShiftSyncId: localStorage.getItem(
              "moysklad_retail_shift_id",
            ),

            // Способ возврата
            payment: {
              cash: returnPaymentMethod === "cash" ? total : 0,
              card: returnPaymentMethod === "card" ? total : 0,
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось оформить возврат");
      }

      console.log("Возврат успешно создан:", data);

      setSuccess(true);
      setReturnCart([]);

      await onRefresh();
    } catch (err) {
      console.error("Return error:", err);

      setReturnError(err.message || "Не удалось оформить возврат");
    } finally {
      setReturnLoading(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(15,23,42,.72)",
          backdropFilter: "blur(8px)",
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
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
            }}
          >
            <Check size={32} />
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "22px",
            }}
          >
            Возврат оформлен
          </h2>

          <p
            style={{
              margin: "10px 0 22px",
              color: "#64748b",
            }}
          >
            Товары успешно отправлены на возврат в МойСклад.
          </p>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              height: "44px",
              border: "none",
              borderRadius: "10px",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(15,23,42,.72)",
        backdropFilter: "blur(8px)",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="animate-modal"
        style={{
          width: "100%",
          maxWidth: "1400px",
          height: "92vh",
          background: "#fff",
          borderRadius: "24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: "72px",
            minHeight: "72px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#fff7ed",
                color: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={21} />
            </div>

            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 750,
                }}
              >
                Возврат товаров
              </div>

              <div
                style={{
                  marginTop: "2px",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Товары из МойСклад
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{
                width: "40px",
                height: "40px",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={onClose}
              style={{
                width: "40px",
                height: "40px",
                border: "none",
                borderRadius: "10px",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
          }}
        >
          <div
            style={{
              flex: 1,
              padding: "20px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                position: "relative",
                marginBottom: "16px",
              }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск товара..."
                style={{
                  width: "100%",
                  height: "46px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "0 16px 0 42px",
                  outline: "none",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div
                style={{
                  minHeight: "300px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "10px",
                  color: "#94a3b8",
                }}
              >
                <Package size={38} />
                Товары не найдены
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(190px, 1fr))",
                  gap: "12px",
                }}
              >
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 650,
                        minHeight: "38px",
                      }}
                    >
                      {product.name || "Без названия"}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontWeight: 700,
                      }}
                    >
                      {formatMoney(product.price)}
                    </div>

                    <button
                      onClick={() => addToReturn(product)}
                      style={{
                        width: "100%",
                        height: "38px",
                        marginTop: "12px",
                        border: "none",
                        borderRadius: "9px",
                        background: "#fff7ed",
                        color: "#ea580c",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontWeight: 650,
                      }}
                    >
                      <Plus size={17} />
                      Добавить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              width: "380px",
              minWidth: "380px",
              borderLeft: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "18px",
                background: "#fff",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 750,
                    fontSize: "17px",
                  }}
                >
                  Возврат
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {returnCart.length} товар(ов)
                </div>
              </div>

              {returnCart.length > 0 && (
                <button
                  onClick={clearReturnCart}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "12px",
                  }}
                >
                  <Trash2 size={15} />
                  Очистить
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px",
              }}
            >
              {returnCart.length === 0 ? (
                <div
                  style={{
                    height: "220px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "10px",
                    color: "#94a3b8",
                  }}
                >
                  <RotateCcw size={38} />

                  <div>Выберите товары для возврата</div>
                </div>
              ) : (
                returnCart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 650,
                          }}
                        >
                          {item.name}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          {formatMoney(item.price)}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromReturn(item.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#94a3b8",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{
                            width: "30px",
                            height: "30px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Minus size={14} />
                        </button>

                        <span
                          style={{
                            width: "24px",
                            textAlign: "center",
                            fontWeight: 650,
                          }}
                        >
                          {item.qty}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{
                            width: "30px",
                            height: "30px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <strong>
                        {formatMoney(Number(item.price || 0) * item.qty)}
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                background: "#fff",
                borderTop: "1px solid #e2e8f0",
                padding: "16px",
              }}
            >
              {returnError && (
                <div
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: "9px",
                    fontSize: "12px",
                    display: "flex",
                    gap: "7px",
                  }}
                >
                  <AlertCircle size={15} />
                  {returnError}
                </div>
              )}

              {/* Способ возврата */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setReturnPaymentMethod("cash");
                    setReturnError(null);
                  }}
                  style={{
                    height: "44px",
                    border:
                      returnPaymentMethod === "cash"
                        ? "2px solid #ea580c"
                        : "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background:
                      returnPaymentMethod === "cash"
                        ? "#fff7ed"
                        : "#fff",
                    color:
                      returnPaymentMethod === "cash"
                        ? "#ea580c"
                        : "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Banknote size={18} />
                  Наличными
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReturnPaymentMethod("card");
                    setReturnError(null);
                  }}
                  style={{
                    height: "44px",
                    border:
                      returnPaymentMethod === "card"
                        ? "2px solid #ea580c"
                        : "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background:
                      returnPaymentMethod === "card"
                        ? "#fff7ed"
                        : "#fff",
                    color:
                      returnPaymentMethod === "card"
                        ? "#ea580c"
                        : "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <CreditCard size={18} />
                  Картой
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "20px",
                  fontWeight: 800,
                  marginBottom: "13px",
                }}
              >
                <span>Итого</span>

                <span>{formatMoney(total)}</span>
              </div>

              <button
                disabled={returnLoading || returnCart.length === 0}
                onClick={handleReturn}
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  borderRadius: "10px",
                  background:
                    returnLoading || returnCart.length === 0
                      ? "#cbd5e1"
                      : "#ea580c",
                  color: "#fff",
                  fontWeight: 750,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor:
                    returnLoading || returnCart.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <RotateCcw size={18} />

                {returnLoading ? "Оформление..." : "Оформить возврат"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Return;