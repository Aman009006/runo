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
      const response = await fetch(`${API_URL}/api/moysklad/returns`, {
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

          payment: {
            cash: returnPaymentMethod === "cash" ? total : 0,
            card: returnPaymentMethod === "card" ? total : 0,
          },
        }),
      });

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
          boxSizing: "border-box",
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
            boxSizing: "border-box",
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
              cursor: "pointer",
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
        boxSizing: "border-box",
      }}
    >
      <div
        className="animate-modal"
        style={{
          width: "100%",
          maxWidth: "1400px",
          height: "92vh",
          maxHeight: "100%",
          background: "#fff",
          borderRadius: "24px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            height: "72px",
            minHeight: "72px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 22px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                minWidth: "42px",
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

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 750,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
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
              flexShrink: 0,
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
                cursor: loading ? "not-allowed" : "pointer",
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
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* PRODUCTS */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "20px",
              overflowY: "auto",
              boxSizing: "border-box",
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
                  pointerEvents: "none",
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
                  boxSizing: "border-box",
                  fontSize: "14px",
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
                  fontSize: "13px",
                }}
              >
                <AlertCircle size={17} />
                <span>{error}</span>
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
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 650,
                        minHeight: "38px",
                        overflowWrap: "anywhere",
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
                        cursor: "pointer",
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

          {/* RETURN CART */}
          <div
            style={{
              width: "380px",
              minWidth: "380px",
              borderLeft: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
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
                gap: "10px",
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
                    cursor: "pointer",
                    whiteSpace: "nowrap",
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
                minHeight: 0,
                overflowY: "auto",
                padding: "14px",
                boxSizing: "border-box",
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
                    textAlign: "center",
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
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 650,
                            overflowWrap: "anywhere",
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
                          cursor: "pointer",
                          flexShrink: 0,
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
                        gap: "10px",
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
                            cursor: "pointer",
                            flexShrink: 0,
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
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <strong
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoney(Number(item.price || 0) * item.qty)}
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* BOTTOM */}
            <div
              style={{
                background: "#fff",
                borderTop: "1px solid #e2e8f0",
                padding: "16px",
                boxSizing: "border-box",
                flexShrink: 0,
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
                    alignItems: "flex-start",
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{returnError}</span>
                </div>
              )}

              {/* PAYMENT */}
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
                    minWidth: 0,
                  }}
                >
                  <Banknote size={18} />
                  <span>Наличными</span>
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
                    minWidth: 0,
                  }}
                >
                  <CreditCard size={18} />
                  <span>Картой</span>
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "20px",
                  fontWeight: 800,
                  marginBottom: "13px",
                }}
              >
                <span>Итого</span>

                <span
                  style={{
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMoney(total)}
                </span>
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

      {/* MOBILE RESPONSIVE */}
      <style>
        {`
          @media (max-width: 768px) {
            .animate-modal {
              width: 100% !important;
              height: calc(100vh - 16px) !important;
              max-height: calc(100vh - 16px) !important;
              border-radius: 18px !important;
            }

            .animate-modal > div:first-child {
              padding-left: 14px !important;
              padding-right: 14px !important;
            }

            .animate-modal > div:nth-child(2) {
              flex-direction: column !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
            }

            .animate-modal > div:nth-child(2) > div:first-child {
              flex: none !important;
              width: 100% !important;
              min-width: 0 !important;
              height: auto !important;
              max-height: 52vh !important;
              padding: 14px !important;
              overflow-y: auto !important;
              box-sizing: border-box !important;
              border-bottom: 1px solid #e2e8f0 !important;
            }

            .animate-modal > div:nth-child(2) > div:first-child > div:last-child {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }

            .animate-modal > div:nth-child(2) > div:last-child {
              width: 100% !important;
              min-width: 0 !important;
              flex: 1 !important;
              border-left: none !important;
              min-height: 48vh !important;
              box-sizing: border-box !important;
            }
          }

          @media (max-width: 480px) {
            .animate-modal {
              height: 100vh !important;
              max-height: 100vh !important;
              border-radius: 0 !important;
            }

            .animate-modal > div:first-child {
              height: 64px !important;
              min-height: 64px !important;
            }

            .animate-modal > div:first-child > div:first-child > div:first-child {
              width: 36px !important;
              height: 36px !important;
              min-width: 36px !important;
            }

            .animate-modal > div:first-child > div:first-child > div:last-child > div:first-child {
              font-size: 16px !important;
            }

            .animate-modal > div:nth-child(2) > div:first-child {
              max-height: 46vh !important;
            }

            .animate-modal > div:nth-child(2) > div:first-child > div:last-child {
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
            }

            .animate-modal > div:nth-child(2) > div:last-child {
              min-height: 54vh !important;
            }

            .animate-modal > div:nth-child(2) > div:last-child > div:last-child {
              padding: 12px !important;
            }
          }

          @media (max-width: 360px) {
            .animate-modal > div:nth-child(2) > div:first-child > div:last-child {
              grid-template-columns: 1fr !important;
            }

            .animate-modal > div:nth-child(2) > div:last-child > div:last-child > div:first-of-type {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </div>
  );
}

export default Return;

