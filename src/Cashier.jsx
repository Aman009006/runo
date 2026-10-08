
import React, { useEffect, useMemo, useState } from "react";

import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Barcode,
  Receipt,
} from "lucide-react";

import API_URL from "./config.js";

const SHIFT_STORAGE_KEY = "moysklad_retail_shift_id";

function Cashier({ isOpen, products, loading, error, onRefresh, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState([]);

  const [salespersons, setSalespersons] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState("");
  const [salespersonsLoading, setSalespersonsLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [paymentAmounts, setPaymentAmounts] = useState({
    cash: "",
    card: "",
    credit: "",
    delivery: "",
    online_qr: "",
  });

  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

  const fetchSalespersons = async () => {
  setSalespersonsLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/api/moysklad/salespersons`,
      {
        credentials: "include",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Не удалось загрузить продавцов",
      );
    }

    const sellers = Array.isArray(data)
      ? data
      : Array.isArray(data.salespersons)
        ? data.salespersons
        : [];

    setSalespersons(sellers);

    if (
      sellers.length === 1 &&
      (sellers[0].id || sellers[0].syncId)
    ) {
      setSelectedSalesperson(
        sellers[0].id || sellers[0].syncId,
      );
    }
  } catch (error) {
    console.error("Ошибка загрузки продавцов:", error);
    setSalespersons([]);
  } finally {
    setSalespersonsLoading(false);
  }
};

    fetchSalespersons();
  }, [isOpen]);

  const categories = useMemo(() => {
    const cats = new Set();

    products.forEach((product) => {
      if (product.pathName) {
        const rootCat = product.pathName.split("/")[0].trim();

        if (rootCat) {
          cats.add(rootCat);
        }
      }
    });

    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        product.name?.toLowerCase().includes(q) ||
        product.code?.toLowerCase().includes(q) ||
        product.article?.toLowerCase().includes(q) ||
        (product.barcodes &&
          product.barcodes.some((barcode) =>
            Object.values(barcode).some((value) =>
              String(value).toLowerCase().includes(q),
            ),
          ));

      const matchesCategory =
        selectedCategory === "All" ||
        (product.pathName &&
          product.pathName.startsWith(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("ru-RU", {
      style: "currency",
      currency: "SOM",
      maximumFractionDigits: 0,
    });
  };

  const addToCart = (product) => {
    if (Number(product.stock || 0) <= 0) {
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.id === product.id,
      );

      if (existing) {
        if (
          Number(existing.qty) >= Number(product.stock)
        ) {
          return prev;
        }

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
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id !== id) {
            return item;
          }

          const newQty = item.qty + delta;

          if (
            delta > 0 &&
            Number(item.stock || 0) > 0 &&
            newQty > Number(item.stock)
          ) {
            return item;
          }

          return newQty > 0
            ? {
                ...item,
                qty: newQty,
              }
            : null;
        })
        .filter(Boolean);
    });
  };

  const updateItemPrice = (id, value) => {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              price: value,
            }
          : item,
      ),
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const clearPaymentAmounts = () => {
    setPaymentAmounts({
      cash: "",
      card: "",
      credit: "",
      delivery: "",
      online_qr: "",
    });
  };

  const subtotalKopecks = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = Number(item.price || 0);

      return sum + price * item.qty;
    }, 0);
  }, [cart]);

  const totalSom = subtotalKopecks;

  const mixedPaymentTotalSom = useMemo(() => {
    return (
      Number(paymentAmounts.cash || 0) +
      Number(paymentAmounts.card || 0) +
      Number(paymentAmounts.credit || 0) +
      Number(paymentAmounts.delivery || 0) +
      Number(paymentAmounts.online_qr || 0)
    );
  }, [paymentAmounts]);

  const mixedPaymentRemainingSom =
    totalSom - mixedPaymentTotalSom;

  const selectedMixedPaymentMethods = useMemo(() => {
    return Object.values(paymentAmounts).filter(
      (value) => Number(value || 0) > 0,
    ).length;
  }, [paymentAmounts]);

  const isMixedPaymentValid = useMemo(() => {
    if (paymentMethod !== "all") {
      return true;
    }

    const total = Math.round(
      Number(totalSom || 0) * 100,
    );

    const entered = Math.round(
      Number(mixedPaymentTotalSom || 0) * 100,
    );

    return (
      selectedMixedPaymentMethods >= 2 &&
      selectedMixedPaymentMethods <= 4 &&
      entered === total &&
      entered > 0
    );
  }, [
    paymentMethod,
    selectedMixedPaymentMethods,
    mixedPaymentTotalSom,
    totalSom,
  ]);

  const canCheckout = useMemo(() => {
    if (cart.length === 0) {
      return false;
    }

    if (paymentMethod === "all") {
      return isMixedPaymentValid;
    }

    return true;
  }, [
    cart.length,
    paymentMethod,
    isMixedPaymentValid,
  ]);

  const updatePaymentAmount = (method, value) => {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: value,
    }));
  };

  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
  };

  const getPaymentBreakdown = () => {
    if (paymentMethod === "cash") {
      return {
        cash: totalSom,
        card: 0,
        credit: 0,
        delivery: 0,
        online_qr: 0,
      };
    }

    if (paymentMethod === "card") {
      return {
        cash: 0,
        card: totalSom,
        credit: 0,
        delivery: 0,
        online_qr: 0,
      };
    }

    if (paymentMethod === "credit") {
      return {
        cash: 0,
        card: 0,
        credit: totalSom,
        delivery: 0,
        online_qr: 0,
      };
    }

    if (paymentMethod === "delivery") {
      return {
        cash: 0,
        card: 0,
        credit: 0,
        delivery: totalSom,
        online_qr: 0,
      };
    }

    if (paymentMethod === "online_qr") {
      return {
        cash: 0,
        card: 0,
        credit: 0,
        delivery: 0,
        online_qr: totalSom,
      };
    }

    return {
      cash: Number(paymentAmounts.cash || 0),
      card: Number(paymentAmounts.card || 0),
      credit: Number(paymentAmounts.credit || 0),
      delivery: Number(paymentAmounts.delivery || 0),
      online_qr: Number(paymentAmounts.online_qr || 0),
    };
  };

  const handleCheckout = async () => {
    if (isCheckoutProcessing) {
      return;
    }

    if (cart.length === 0) {
      return;
    }

    if (
      paymentMethod === "all" &&
      !isMixedPaymentValid
    ) {
      return;
    }

    const retailShiftSyncId =
      localStorage.getItem(SHIFT_STORAGE_KEY);

    if (!retailShiftSyncId) {
      alert(
        "Смена не открыта. Сначала откройте кассовую смену.",
      );
      return;
    }

    setIsCheckoutProcessing(true);

    const payments = getPaymentBreakdown();

    const totalInKopecks = Math.round(
      Number(totalSom || 0) * 100,
    );

    const paymentInKopecks = {
      cash: Math.round(
        Number(payments.cash || 0) * 100,
      ),
      card: Math.round(
        Number(payments.card || 0) * 100,
      ),
      amanat: Math.round(
        Number(payments.delivery || 0) * 100,
      ),
      mplus: Math.round(
        Number(payments.credit || 0) * 100,
      ),
      online_qr: Math.round(
        Number(payments.online_qr || 0) * 100,
      ),
    };

    const selectedSeller = salespersons.find(
      (seller) =>
        (seller.id || seller.syncId) ===
        selectedSalesperson,
    );

    const orderData = {
      orderId: `MS-POS-${Math.floor(
        100000 + Math.random() * 900000,
      )}`,

      date: new Date().toLocaleString("ru-RU"),

      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.qty || 0),
        type: item.type || "product",
      })),

      subtotal: subtotalKopecks,
      total: totalSom,

      paymentMethod,

      payments,

      salespersonId:
        selectedSeller?.id ||
        selectedSeller?.syncId ||
        null,

      salesperson:
        selectedSeller?.name ||
        selectedSeller?.fullName ||
        selectedSeller?.title ||
        "",
    };

    try {
      const response = await fetch(
        `${API_URL}/api/moysklad/sales`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderData.orderId,
            items: orderData.items,
            total: totalInKopecks,

            payment: {
              method: paymentMethod,
              ...paymentInKopecks,
            },

            retailShiftSyncId,

            salespersonId: orderData.salespersonId,
            salesperson: orderData.salesperson,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Не удалось создать продажу",
        );
      }

      console.log(
        "Продажа создана в МойСклад:",
        data,
      );

      setLastOrder(orderData);
      setShowReceiptModal(true);

      clearCart();
      clearPaymentAmounts();
      setPaymentMethod("cash");

      await onRefresh();

      setIsCheckoutProcessing(false);
    } catch (error) {
      console.error(
        "Ошибка отправки продажи:",
        error,
      );

      alert(
        error.message ||
          "Произошла ошибка при создании продажи",
      );

      setIsCheckoutProcessing(false);
    }
  };

  const handleForceRefresh = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/moysklad/products/refresh`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не удалось обновить товары",
        );
      }

      console.log(
        "✅ Принудительно обновлён кеш товаров:",
        data.data?.rows?.length || 0,
      );

      if (typeof onRefresh === "function") {
        await onRefresh(data.data);
      }
    } catch (error) {
      console.error(
        "Ошибка принудительного обновления кеша:",
        error,
      );

      alert(
        error.message ||
          "Не удалось обновить товары",
      );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "rgba(15,23,42,.72)",
          backdropFilter: "blur(8px)",
          padding: isMobile ? "0" : "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="animate-modal"
          style={{
            width: "100%",
            maxWidth: "1500px",
            height: isMobile ? "100dvh" : "92vh",
            maxHeight: isMobile ? "100dvh" : undefined,
            background: "#fff",
            borderRadius: isMobile ? "0" : "24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 30px 80px rgba(0,0,0,.25)",
          }}
        >
          {/* HEADER */}

          <div
            style={{
              height: isMobile ? "60px" : "72px",
              minHeight: isMobile ? "60px" : "72px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile
                ? "0 12px"
                : "0 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: isMobile ? "36px" : "42px",
                  height: isMobile ? "36px" : "42px",
                  borderRadius: "11px",
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShoppingCart
                  size={isMobile ? 19 : 21}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: isMobile
                      ? "15px"
                      : "18px",
                    fontWeight: 750,
                  }}
                >
                  Рабочее место Кассира
                </div>

                <div
                  style={{
                    marginTop: "1px",
                    fontSize: "11px",
                    color: "#16a34a",
                  }}
                >
                  ● МойСклад Synced
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <button
                onClick={handleForceRefresh}
                disabled={loading}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <RefreshCw
                  size={17}
                  style={{
                    animation: loading
                      ? "spin 1s linear infinite"
                      : "none",
                  }}
                />
              </button>

              <button
                onClick={onClose}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <X size={19} />
              </button>
            </div>
          </div>

          {/* MAIN */}

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: isMobile
                ? "column"
                : "row",
            }}
          >
            {/* PRODUCTS */}

            <div
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                padding: isMobile
                  ? "10px"
                  : "20px",
                overflowY: "auto",

                ...(isMobile
                  ? {
                      flex: "0 0 40%",
                      maxHeight: "40%",
                      borderBottom:
                        "1px solid #e2e8f0",
                    }
                  : {}),
              }}
            >
              <div
                style={{
                  position: "relative",
                  marginBottom: "12px",
                }}
              >
                <Search
                  size={17}
                  style={{
                    position: "absolute",
                    left: "13px",
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />

                <input
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value)
                  }
                  placeholder="Поиск товара, артикула, штрихкода..."
                  style={{
                    width: "100%",
                    height: "42px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "11px",
                    padding:
                      "0 12px 0 40px",
                    outline: "none",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  overflowX: "auto",
                  paddingBottom: "7px",
                  marginBottom: "12px",
                  scrollbarWidth: "thin",
                }}
              >
                {categories.map((category) => {
                  const active =
                    selectedCategory === category;

                  return (
                    <button
                      key={category}
                      onClick={() =>
                        setSelectedCategory(category)
                      }
                      style={{
                        flexShrink: 0,
                        padding: "8px 12px",
                        borderRadius: "9px",
                        border: active
                          ? "1px solid #2563eb"
                          : "1px solid #e2e8f0",
                        background: active
                          ? "#2563eb"
                          : "#fff",
                        color: active
                          ? "#fff"
                          : "#475569",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "10px 12px",
                    background: "#fef2f2",
                    border:
                      "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#b91c1c",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "12px",
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    minHeight: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  Загрузка товаров...
                </div>
              ) : filteredProducts.length ===
                0 ? (
                <div
                  style={{
                    minHeight: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "10px",
                    color: "#64748b",
                  }}
                >
                  <Barcode size={34} />
                  <span>
                    Товары не найдены
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: isMobile ? "8px" : "12px",
                  }}
                >
                  {filteredProducts.map(
                    (product) => {
                      const stock = Number(
                        product.stock || 0,
                      );

                      const outOfStock =
                        stock <= 0;

                      return (
                        <div
                          key={product.id}
                          style={{
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: isMobile
                              ? "11px"
                              : "14px",
                            padding: isMobile
                              ? "10px"
                              : "14px",
                            background: "#fff",
                            opacity: outOfStock
                              ? 0.55
                              : 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              minHeight: isMobile
                                ? "34px"
                                : "40px",
                              fontSize: isMobile
                                ? "12px"
                                : "14px",
                              fontWeight: 650,
                              lineHeight: 1.35,
                              overflow: "hidden",
                              display:
                                "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient:
                                "vertical",
                            }}
                          >
                            {product.name ||
                              "Без названия"}
                          </div>

                          {product.code && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "10px",
                                color:
                                  "#94a3b8",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              Артикул:{" "}
                              {product.code}
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              gap: "5px",
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  isMobile
                                    ? "12px"
                                    : "15px",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {formatMoney(
                                product.price,
                              )}
                            </strong>

                            <span
                              style={{
                                fontSize: "9px",
                                color: outOfStock
                                  ? "#dc2626"
                                  : "#16a34a",
                                textAlign: "right",
                              }}
                            >
                              {outOfStock
                                ? "Нет"
                                : `Остаток: ${stock}`}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              addToCart(product)
                            }
                            disabled={outOfStock}
                            style={{
                              width: "100%",
                              marginTop: "9px",
                              height: isMobile
                                ? "34px"
                                : "38px",
                              border: "none",
                              borderRadius: "8px",
                              background:
                                outOfStock
                                  ? "#e2e8f0"
                                  : "#0f172a",
                              color: outOfStock
                                ? "#94a3b8"
                                : "#fff",
                              display: "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              gap: "5px",
                              fontWeight: 650,
                              fontSize: isMobile
                                ? "11px"
                                : "13px",
                            }}
                          >
                            <Plus
                              size={
                                isMobile
                                  ? 14
                                  : 17
                              }
                            />
                            Добавить
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            {/* CART / PAYMENT */}

            <div
              style={{
                width: isMobile
                  ? "100%"
                  : "380px",

                minWidth: isMobile
                  ? "0"
                  : "380px",

                borderLeft: isMobile
                  ? "none"
                  : "1px solid #e2e8f0",

                borderTop: isMobile
                  ? "1px solid #e2e8f0"
                  : "none",

                background: "#f8fafc",

                display: "flex",
                flexDirection: "column",

                minHeight: 0,

                flex: isMobile
                  ? "1 1 60%"
                  : undefined,
              }}
            >
              {/* CART HEADER */}

              <div
                style={{
                  padding: isMobile
                    ? "10px 12px"
                    : "18px",
                  borderBottom:
                    "1px solid #e2e8f0",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  flexShrink: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: isMobile
                        ? "15px"
                        : "17px",
                      fontWeight: 750,
                    }}
                  >
                    Текущий чек
                  </div>

                  <div
                    style={{
                      marginTop: "2px",
                      fontSize: "11px",
                      color: "#64748b",
                    }}
                  >
                    {cart.length} товар(ов)
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color: "#dc2626",
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "5px",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} />
                    Очистить
                  </button>
                )}
              </div>

              {/* CART SCROLL */}

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: isMobile
                    ? "10px"
                    : "14px",
                }}
              >
                {cart.length === 0 ? (
                  <div
                    style={{
                      height: isMobile
                        ? "150px"
                        : "220px",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexDirection:
                        "column",
                      gap: "9px",
                      color: "#94a3b8",
                      textAlign:
                        "center",
                    }}
                  >
                    <ShoppingCart
                      size={
                        isMobile ? 32 : 38
                      }
                    />

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: isMobile
                          ? "13px"
                          : "14px",
                      }}
                    >
                      Корзина пуста
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                      }}
                    >
                      Добавьте товары слева
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "#fff",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: "11px",
                        padding: isMobile
                          ? "10px"
                          : "12px",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "8px",
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
                              fontSize: isMobile
                                ? "12px"
                                : "13px",
                              fontWeight: 650,
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </div>

                          <div
                            style={{
                              marginTop: "7px",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "10px",
                                color:
                                  "#64748b",
                                marginBottom:
                                  "4px",
                              }}
                            >
                              Цена за единицу
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                              }}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                value={
                                  item.price ??
                                  ""
                                }
                                onChange={(e) =>
                                  updateItemPrice(
                                    item.id,
                                    e.target
                                      .value,
                                  )
                                }
                                style={{
                                  width: isMobile
                                    ? "95px"
                                    : "110px",
                                  height: "30px",
                                  border:
                                    "1px solid #cbd5e1",
                                  borderRadius:
                                    "7px",
                                  padding:
                                    "0 8px",
                                  outline:
                                    "none",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    600,
                                  color:
                                    "#0f172a",
                                  background:
                                    "#fff",
                                }}
                              />

                              <span
                                style={{
                                  fontSize:
                                    "11px",
                                  color:
                                    "#64748b",
                                }}
                              >
                                сом
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            removeFromCart(
                              item.id,
                            )
                          }
                          style={{
                            border: "none",
                            background:
                              "transparent",
                            color: "#94a3b8",
                            padding: "2px",
                            height: "24px",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          marginTop: "9px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "6px",
                          }}
                        >
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                -1,
                              )
                            }
                            style={{
                              width: "29px",
                              height: "29px",
                              border:
                                "1px solid #e2e8f0",
                              borderRadius:
                                "8px",
                              background:
                                "#fff",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                            }}
                          >
                            <Minus size={13} />
                          </button>

                          <span
                            style={{
                              width: "23px",
                              textAlign:
                                "center",
                              fontWeight:
                                650,
                              fontSize:
                                "13px",
                            }}
                          >
                            {item.qty}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                1,
                              )
                            }
                            disabled={
                              Number(
                                item.stock ||
                                  0,
                              ) > 0 &&
                              item.qty >=
                                Number(
                                  item.stock,
                                )
                            }
                            style={{
                              width: "29px",
                              height: "29px",
                              border:
                                "1px solid #e2e8f0",
                              borderRadius:
                                "8px",
                              background:
                                "#fff",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <strong
                          style={{
                            fontSize: isMobile
                              ? "13px"
                              : "14px",
                          }}
                        >
                          {formatMoney(
                            Number(
                              item.price || 0,
                            ) * item.qty,
                          )}
                        </strong>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAYMENT BLOCK */}

              <div
                style={{
                  borderTop:
                    "1px solid #e2e8f0",
                  background: "#fff",
                  padding: isMobile
                    ? "10px"
                    : "16px",

                  ...(isMobile
                    ? {
                        position: "relative",
                        zIndex: 20,
                        flexShrink: 0,
                        maxHeight: "58%",
                        overflowY: "auto",
                        boxShadow:
                          "0 -6px 18px rgba(15,23,42,.08)",
                      }
                    : {}),
                }}
              >
                {/* SELLER */}

                <div
                  style={{
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#475569",
                      marginBottom: "6px",
                    }}
                  >
                    Продавец
                  </div>

                  <select
                    value={selectedSalesperson}
                    onChange={(e) =>
                      setSelectedSalesperson(
                        e.target.value,
                      )
                    }
                    disabled={
                      salespersonsLoading
                    }
                    style={{
                      width: "100%",
                      height: "36px",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: "9px",
                      background: "#fff",
                      color: "#0f172a",
                      padding: "0 10px",
                      outline: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <option value="">
                      {salespersonsLoading
                        ? "Загрузка продавцов..."
                        : "Выберите продавца"}
                    </option>

                    {salespersons.map(
                      (seller) => (
                        <option
                          key={
                            seller.id ||
                            seller.syncId
                          }
                          value={
                            seller.id ||
                            seller.syncId
                          }
                        >
                          {seller.name ||
                            seller.fullName ||
                            seller.title ||
                            "Без имени"}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* TOTAL */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    color: "#64748b",
                    fontSize: "12px",
                    marginBottom: "6px",
                  }}
                >
                  <span>Подытог</span>
                  <span>
                    {formatMoney(
                      subtotalKopecks,
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    fontSize: isMobile
                      ? "19px"
                      : "21px",
                    fontWeight: 800,
                    marginBottom: "11px",
                  }}
                >
                  <span>Итого</span>

                  <span>
                    {formatMoney(totalSom)}
                  </span>
                </div>

                {/* PAYMENT METHODS */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, 1fr)",
                    gap: "6px",
                  }}
                >
                  {[
                    ["cash", "Наличные"],
                    ["card", "Карта"],
                    ["credit", "В кредит"],
                    ["delivery", "Аманат"],
                    ["online_qr", "Онлайн QR"],
                    ["all", "Смешанная"],
                  ].map(
                    ([method, label]) => (
                      <button
                        key={method}
                        onClick={() =>
                          selectPaymentMethod(
                            method,
                          )
                        }
                        style={{
                          height: "36px",
                          borderRadius:
                            "9px",
                          border:
                            paymentMethod ===
                            method
                              ? "1px solid #2563eb"
                              : "1px solid #e2e8f0",
                          background:
                            paymentMethod ===
                            method
                              ? "#eff6ff"
                              : "#fff",
                          color:
                            paymentMethod ===
                            method
                              ? "#2563eb"
                              : "#475569",
                          fontSize: "11px",
                          fontWeight: 650,
                        }}
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>

                {/* MIXED PAYMENT */}

                {paymentMethod === "all" && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius: "11px",
                      background: "#f8fafc",

                      ...(isMobile
                        ? {
                            maxHeight:
                              "145px",
                            overflowY:
                              "auto",
                            scrollbarWidth:
                              "thin",
                          }
                        : {}),
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      Суммы оплаты
                    </div>

                    {[
                      ["cash", "Наличные"],
                      ["card", "Карта"],
                      ["credit", "Кредит"],
                      ["delivery", "Аманат"],
                      [
                        "online_qr",
                        "Онлайн QR",
                      ],
                    ].map(
                      ([method, label]) => (
                        <div
                          key={method}
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: "7px",
                            marginBottom:
                              "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "68px",
                              fontSize: "10px",
                              color:
                                "#64748b",
                              flexShrink: 0,
                            }}
                          >
                            {label}
                          </span>

                          <input
                            value={
                              paymentAmounts[
                                method
                              ]
                            }
                            onChange={(e) =>
                              updatePaymentAmount(
                                method,
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            inputMode="decimal"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              height: "30px",
                              border:
                                "1px solid #e2e8f0",
                              borderRadius:
                                "7px",
                              padding:
                                "0 8px",
                              outline:
                                "none",
                              fontSize:
                                "11px",
                            }}
                          />
                        </div>
                      ),
                    )}

                    <div
                      style={{
                        marginTop: "7px",
                        paddingTop: "7px",
                        borderTop:
                          "1px solid #e2e8f0",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                        }}
                      >
                        <span>
                          Внесено
                        </span>

                        <strong>
                          {mixedPaymentTotalSom.toFixed(
                            2,
                          )}{" "}
                          сом
                        </strong>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          marginTop: "4px",
                          color:
                            mixedPaymentRemainingSom ===
                            0
                              ? "#16a34a"
                              : mixedPaymentRemainingSom >
                                  0
                                ? "#dc2626"
                                : "#ea580c",
                        }}
                      >
                        <span>
                          {mixedPaymentRemainingSom ===
                          0
                            ? "Сумма совпадает"
                            : mixedPaymentRemainingSom >
                                0
                              ? "Не хватает"
                              : "Превышение"}
                        </span>

                        <strong>
                          {Math.abs(
                            mixedPaymentRemainingSom,
                          ).toFixed(2)}{" "}
                          сом
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHECKOUT BUTTON */}

                <button
                  disabled={
                    !canCheckout ||
                    isCheckoutProcessing
                  }
                  onClick={handleCheckout}
                  style={{
                    width: "100%",
                    height: "46px",
                    marginTop: "10px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      canCheckout &&
                      !isCheckoutProcessing
                        ? "#16a34a"
                        : "#cbd5e1",
                    color: "#fff",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    fontWeight: 750,
                    fontSize: "14px",
                    cursor:
                      canCheckout &&
                      !isCheckoutProcessing
                        ? "pointer"
                        : "not-allowed",

                    ...(isMobile
                      ? {
                          position:
                            "sticky",
                          bottom: 0,
                          zIndex: 30,
                          boxShadow:
                            "0 -5px 12px rgba(255,255,255,.95)",
                          flexShrink: 0,
                        }
                      : {}),
                  }}
                >
                  {isCheckoutProcessing ? (
                    <>
                      <RefreshCw
                        size={18}
                        style={{
                          animation:
                            "spin 1s linear infinite",
                        }}
                      />

                      Обработка...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Оплатить
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}

      {showReceiptModal && lastOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background:
              "rgba(15,23,42,.7)",
            backdropFilter:
              "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile
              ? "10px"
              : "20px",
          }}
        >
          <div
            className="animate-modal"
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: isMobile
                ? "16px"
                : "20px",
              padding: isMobile
                ? "16px"
                : "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "9px",
                }}
              >
                <Receipt
                  size={21}
                />

                <h2
                  style={{
                    margin: 0,
                    fontSize: isMobile
                      ? "19px"
                      : "21px",
                  }}
                >
                  Чек
                </h2>
              </div>

              <button
                onClick={() =>
                  setShowReceiptModal(
                    false,
                  )
                }
                style={{
                  width: "34px",
                  height: "34px",
                  border: "none",
                  borderRadius: "9px",
                  background:
                    "#f1f5f9",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                padding: "13px",
                background:
                  "#f8fafc",
                borderRadius: "11px",
                marginBottom: "14px",
                fontSize: "12px",
              }}
            >
              <div>
                Номер:{" "}
                <strong>
                  {lastOrder.orderId}
                </strong>
              </div>

              <div
                style={{
                  marginTop: "5px",
                  color: "#64748b",
                }}
              >
                {lastOrder.date}
              </div>

              {lastOrder.salesperson && (
                <div
                  style={{
                    marginTop: "7px",
                  }}
                >
                  Продавец:{" "}
                  <strong>
                    {
                      lastOrder.salesperson
                    }
                  </strong>
                </div>
              )}
            </div>

            {lastOrder.items.map(
              (item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "10px",
                    padding:
                      "9px 0",
                    borderBottom:
                      "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    {item.name} ×{" "}
                    {item.quantity}
                  </div>

                  <strong>
                    {formatMoney(
                      Number(
                        item.price || 0,
                      ) *
                        item.quantity,
                    )}
                  </strong>
                </div>
              ),
            )}

            <div
              style={{
                marginTop: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                <span>Подытог</span>

                <span>
                  {formatMoney(
                    lastOrder.subtotal,
                  )}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginTop: "10px",
                  fontSize: isMobile
                    ? "20px"
                    : "22px",
                  fontWeight: 800,
                }}
              >
                <span>Итого</span>

                <span>
                  {formatMoney(
                    lastOrder.total,
                  )}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: "17px",
                paddingTop: "14px",
                borderTop:
                  "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                Оплата
              </div>

              {Object.entries(
                lastOrder.payments,
              ).map(
                ([method, amount]) => {
                  if (!amount) {
                    return null;
                  }

                  const labels = {
                    cash: "Наличные",
                    card: "Карта",
                    credit: "Кредит",
                    delivery: "Аманат",
                    online_qr:
                      "Онлайн QR",
                  };

                  return (
                    <div
                      key={method}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        fontSize: "12px",
                        marginBottom:
                          "5px",
                      }}
                    >
                      <span>
                        {
                          labels[
                            method
                          ]
                        }
                      </span>

                      <strong>
                        {formatMoney(
                          amount,
                        )}
                      </strong>
                    </div>
                  );
                },
              )}
            </div>

            <button
              onClick={() =>
                setShowReceiptModal(
                  false,
                )
              }
              style={{
                width: "100%",
                height: "44px",
                marginTop: "18px",
                border: "none",
                borderRadius: "10px",
                background:
                  "#0f172a",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Cashier;

