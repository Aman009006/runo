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

function Cashier({
  isOpen,
  products,
  loading,
  error,
  onRefresh,
  onClose,
}) {
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
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchSalespersons = async () => {
      setSalespersonsLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/moysklad/salespersons`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Не удалось загрузить продавцов"
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
            sellers[0].id || sellers[0].syncId
          );
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки продавцов:",
          error
        );

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
        const rootCat = product.pathName
          .split("/")[0]
          .trim();

        cats.add(rootCat);
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
              String(value).toLowerCase().includes(q)
            )
          ));

      const matchesCategory =
        selectedCategory === "All" ||
        (product.pathName &&
          product.pathName.startsWith(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
  ]);

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
        (item) => item.id === product.id
      );

      if (existing) {
        if (
          Number(existing.qty) >=
          Number(product.stock)
        ) {
          return prev;
        }

        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
              }
            : item
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

  const removeFromCart = (id) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const clearCart = () => {
    setCart([]);
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
      Number(paymentAmounts.delivery || 0)
    );
  }, [paymentAmounts]);

  const mixedPaymentRemainingSom =
    totalSom - mixedPaymentTotalSom;

  const selectedMixedPaymentMethods = useMemo(() => {
    return Object.values(paymentAmounts).filter(
      (value) => Number(value || 0) > 0
    ).length;
  }, [paymentAmounts]);

  const isMixedPaymentValid = useMemo(() => {
    if (paymentMethod !== "all") {
      return true;
    }

    const total = Math.round(
      Number(totalSom || 0) * 100
    );

    const entered = Math.round(
      Number(mixedPaymentTotalSom || 0) * 100
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
      };
    }

    if (paymentMethod === "card") {
      return {
        cash: 0,
        card: totalSom,
        credit: 0,
        delivery: 0,
      };
    }

    if (paymentMethod === "credit") {
      return {
        cash: 0,
        card: 0,
        credit: totalSom,
        delivery: 0,
      };
    }

    if (paymentMethod === "delivery") {
      return {
        cash: 0,
        card: 0,
        credit: 0,
        delivery: totalSom,
      };
    }

    return {
      cash: Number(paymentAmounts.cash || 0),
      card: Number(paymentAmounts.card || 0),
      credit: Number(paymentAmounts.credit || 0),
      delivery: Number(paymentAmounts.delivery || 0),
    };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      return;
    }

    if (
      paymentMethod === "all" &&
      !isMixedPaymentValid
    ) {
      return;
    }

    const retailShiftSyncId = localStorage.getItem(
      SHIFT_STORAGE_KEY
    );

    if (!retailShiftSyncId) {
      alert(
        "Смена не открыта. Сначала откройте кассовую смену."
      );

      return;
    }

    const payments = getPaymentBreakdown();

    const totalInKopecks = Math.round(
      Number(totalSom || 0) * 100
    );

    const paymentInKopecks = {
      cash: Math.round(
        Number(payments.cash || 0) * 100
      ),

      card: Math.round(
        Number(payments.card || 0) * 100
      ),

      amanat: Math.round(
        Number(payments.delivery || 0) * 100
      ),

      mplus: Math.round(
        Number(payments.credit || 0) * 100
      ),
    };

    const selectedSeller = salespersons.find(
      (seller) =>
        (seller.id || seller.syncId) ===
        selectedSalesperson
    );

    const orderData = {
      orderId: `MS-POS-${Math.floor(
        100000 + Math.random() * 900000
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

            salespersonId:
              orderData.salespersonId,

            salesperson:
              orderData.salesperson,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Не удалось создать продажу"
        );
      }

      console.log(
        "Продажа создана в МойСклад:",
        data
      );

      setLastOrder(orderData);

      setShowReceiptModal(true);

      clearCart();

      await onRefresh();
    } catch (error) {
      console.error(
        "Ошибка отправки продажи:",
        error
      );

      alert(
        error.message ||
          "Произошла ошибка при создании продажи"
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
            maxWidth: "1500px",
            height: "92vh",
            background: "#fff",
            borderRadius: "24px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 30px 80px rgba(0,0,0,.25)",
          }}
        >
          <div
            style={{
              height: "72px",
              minHeight: "72px",
              borderBottom:
                "1px solid #e2e8f0",
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
                  background: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShoppingCart size={21} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 750,
                  }}
                >
                  Рабочее место Кассира
                </div>

                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "12px",
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
                gap: "8px",
              }}
            >
              <button
                onClick={onRefresh}
                disabled={loading}
                style={{
                  width: "40px",
                  height: "40px",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "10px",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                }}
              >
                <RefreshCw
                  size={18}
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
                  width: "40px",
                  height: "40px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
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
                minWidth: 0,
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
                    transform:
                      "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />

                <input
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="Поиск товара, артикула, штрихкода..."
                  style={{
                    width: "100%",
                    height: "46px",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding:
                      "0 16px 0 42px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  marginBottom: "16px",
                }}
              >
                {categories.map((category) => {
                  const active =
                    selectedCategory ===
                    category;

                  return (
                    <button
                      key={category}
                      onClick={() =>
                        setSelectedCategory(
                          category
                        )
                      }
                      style={{
                        flexShrink: 0,
                        padding: "9px 14px",
                        borderRadius: "10px",
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
                        fontSize: "13px",
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
                    marginBottom: "16px",
                    padding:
                      "12px 14px",
                    background: "#fef2f2",
                    border:
                      "1px solid #fecaca",
                    borderRadius: "12px",
                    color: "#b91c1c",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                  }}
                >
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    minHeight: "300px",
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
                    minHeight: "300px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    flexDirection:
                      "column",
                    gap: "10px",
                    color: "#64748b",
                  }}
                >
                  <Barcode size={36} />

                  <span>
                    Товары не найдены
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {filteredProducts.map(
                    (product) => {
                      const stock = Number(
                        product.stock || 0
                      );

                      const outOfStock =
                        stock <= 0;

                      return (
                        <div
                          key={product.id}
                          style={{
                            border:
                              "1px solid #e2e8f0",
                            borderRadius:
                              "14px",
                            padding: "14px",
                            background:
                              "#fff",
                            opacity:
                              outOfStock
                                ? 0.55
                                : 1,
                          }}
                        >
                          <div
                            style={{
                              minHeight: "40px",
                              fontSize:
                                "14px",
                              fontWeight: 650,
                              lineHeight:
                                1.35,
                            }}
                          >
                            {product.name ||
                              "Без названия"}
                          </div>

                          {product.code && (
                            <div
                              style={{
                                marginTop:
                                  "5px",
                                fontSize:
                                  "11px",
                                color:
                                  "#94a3b8",
                              }}
                            >
                              Артикул:{" "}
                              {
                                product.code
                              }
                            </div>
                          )}

                          <div
                            style={{
                              marginTop:
                                "10px",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                            }}
                          >
                            <strong
                              style={{
                                fontSize:
                                  "15px",
                              }}
                            >
                              {formatMoney(
                                product.price
                              )}
                            </strong>

                            <span
                              style={{
                                fontSize:
                                  "11px",
                                color:
                                  outOfStock
                                    ? "#dc2626"
                                    : "#16a34a",
                              }}
                            >
                              {outOfStock
                                ? "Нет в наличии"
                                : `Остаток: ${stock}`}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              addToCart(
                                product
                              )
                            }
                            disabled={
                              outOfStock
                            }
                            style={{
                              width: "100%",
                              marginTop:
                                "12px",
                              height: "38px",
                              border: "none",
                              borderRadius:
                                "9px",
                              background:
                                outOfStock
                                  ? "#e2e8f0"
                                  : "#0f172a",
                              color:
                                outOfStock
                                  ? "#94a3b8"
                                  : "#fff",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              gap: "6px",
                              fontWeight:
                                650,
                            }}
                          >
                            <Plus size={17} />
                            Добавить
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                width: "380px",
                minWidth: "380px",
                borderLeft:
                  "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                flexDirection:
                  "column",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  padding: "18px",
                  borderBottom:
                    "1px solid #e2e8f0",
                  background: "#fff",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 750,
                    }}
                  >
                    Текущий чек
                  </div>

                  <div
                    style={{
                      marginTop: "3px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {cart.length}{" "}
                    товар(ов)
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={
                      clearCart
                    }
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color:
                        "#dc2626",
                      display: "flex",
                      alignItems:
                        "center",
                      gap: "5px",
                      fontSize:
                        "12px",
                      fontWeight: 600,
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
                  overflowY:
                    "auto",
                  padding: "14px",
                }}
              >
                {cart.length === 0 ? (
                  <div
                    style={{
                      height: "220px",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexDirection:
                        "column",
                      gap: "10px",
                      color:
                        "#94a3b8",
                      textAlign:
                        "center",
                    }}
                  >
                    <ShoppingCart
                      size={38}
                    />

                    <div
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      Корзина пуста
                    </div>

                    <div
                      style={{
                        fontSize:
                          "12px",
                      }}
                    >
                      Добавьте товары
                      слева
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background:
                          "#fff",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius:
                          "12px",
                        padding: "12px",
                        marginBottom:
                          "10px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth:
                              0,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "13px",
                              fontWeight:
                                650,
                              lineHeight:
                                1.3,
                            }}
                          >
                            {item.name}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "4px",
                              color:
                                "#64748b",
                              fontSize:
                                "12px",
                            }}
                          >
                            {formatMoney(
                              item.price
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            removeFromCart(
                              item.id
                            )
                          }
                          style={{
                            border:
                              "none",
                            background:
                              "transparent",
                            color:
                              "#94a3b8",
                            padding:
                              "2px",
                            height:
                              "24px",
                          }}
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          marginTop:
                            "10px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "7px",
                          }}
                        >
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                -1
                              )
                            }
                            style={{
                              width:
                                "30px",
                              height:
                                "30px",
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
                            <Minus
                              size={14}
                            />
                          </button>

                          <span
                            style={{
                              width:
                                "24px",
                              textAlign:
                                "center",
                              fontWeight:
                                650,
                            }}
                          >
                            {item.qty}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                1
                              )
                            }
                            disabled={
                              Number(
                                item.stock ||
                                  0
                              ) > 0 &&
                              item.qty >=
                                Number(
                                  item.stock
                                )
                            }
                            style={{
                              width:
                                "30px",
                              height:
                                "30px",
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
                            <Plus
                              size={14}
                            />
                          </button>
                        </div>

                        <strong>
                          {formatMoney(
                            Number(
                              item.price ||
                                0
                            ) *
                              item.qty
                          )}
                        </strong>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #e2e8f0",
                  background: "#fff",
                  padding: "16px",
                }}
              >
                {/* ПРОДАВЕЦ */}
                <div
                  style={{
                    marginBottom:
                      "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      color:
                        "#475569",
                      marginBottom:
                        "7px",
                    }}
                  >
                    Продавец
                  </div>

                  <select
                    value={
                      selectedSalesperson
                    }
                    onChange={(e) =>
                      setSelectedSalesperson(
                        e.target.value
                      )
                    }
                    disabled={
                      salespersonsLoading
                    }
                    style={{
                      width: "100%",
                      height: "38px",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "9px",
                      background:
                        "#fff",
                      color:
                        "#0f172a",
                      padding:
                        "0 10px",
                      outline:
                        "none",
                      fontSize:
                        "13px",
                      fontWeight:
                        600,
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
                      )
                    )}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    color:
                      "#64748b",
                    fontSize:
                      "13px",
                    marginBottom:
                      "7px",
                  }}
                >
                  <span>
                    Подытог
                  </span>

                  <span>
                    {formatMoney(
                      subtotalKopecks
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    fontSize:
                      "21px",
                    fontWeight:
                      800,
                    marginBottom:
                      "14px",
                  }}
                >
                  <span>
                    Итого
                  </span>

                  <span>
                    {formatMoney(
                      totalSom
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, 1fr)",
                    gap: "7px",
                  }}
                >
                  {[
                    ["cash", "Наличные"],
                    ["card", "Карта"],
                    ["credit", "В кредит"],
                    ["delivery", "Аманат"],
                    ["all", "Смешанная"],
                  ].map(
                    ([method, label]) => (
                      <button
                        key={method}
                        onClick={() =>
                          selectPaymentMethod(
                            method
                          )
                        }
                        style={{
                          height:
                            "38px",
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
                          fontSize:
                            "12px",
                          fontWeight:
                            650,
                        }}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>

                {paymentMethod ===
                  "all" && (
                  <div
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "12px",
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "12px",
                      background:
                        "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        marginBottom:
                          "9px",
                      }}
                    >
                      Суммы оплаты
                    </div>

                    {[
                      [
                        "cash",
                        "Наличные",
                      ],
                      [
                        "card",
                        "Карта",
                      ],
                      [
                        "credit",
                        "Кредит",
                      ],
                      [
                        "delivery",
                        "Аманат",
                      ],
                    ].map(
                      ([method, label]) => (
                        <div
                          key={method}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "8px",
                            marginBottom:
                              "7px",
                          }}
                        >
                          <span
                            style={{
                              width:
                                "75px",
                              fontSize:
                                "11px",
                              color:
                                "#64748b",
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
                                e.target
                                  .value
                              )
                            }
                            placeholder="0"
                            inputMode="decimal"
                            style={{
                              flex: 1,
                              height:
                                "32px",
                              border:
                                "1px solid #e2e8f0",
                              borderRadius:
                                "7px",
                              padding:
                                "0 9px",
                              outline:
                                "none",
                              fontSize:
                                "12px",
                            }}
                          />
                        </div>
                      )
                    )}

                    <div
                      style={{
                        marginTop:
                          "9px",
                        paddingTop:
                          "9px",
                        borderTop:
                          "1px solid #e2e8f0",
                        fontSize:
                          "12px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                        }}
                      >
                        <span>
                          Внесено
                        </span>

                        <strong>
                          {mixedPaymentTotalSom.toFixed(
                            2
                          )}{" "}
                          сом
                        </strong>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          marginTop:
                            "5px",
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
                            mixedPaymentRemainingSom
                          ).toFixed(
                            2
                          )}{" "}
                          сом
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  disabled={!canCheckout}
                  onClick={
                    handleCheckout
                  }
                  style={{
                    width: "100%",
                    height: "46px",
                    marginTop:
                      "12px",
                    border: "none",
                    borderRadius:
                      "10px",
                    background:
                      canCheckout
                        ? "#16a34a"
                        : "#cbd5e1",
                    color: "#fff",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "8px",
                    fontWeight:
                      750,
                    fontSize:
                      "14px",
                    cursor:
                      canCheckout
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  <Check size={18} />
                  Оплатить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReceiptModal &&
        lastOrder && (
          <div
            style={{
              position:
                "fixed",
              inset: 0,
              zIndex: 100,
              background:
                "rgba(15,23,42,.7)",
              backdropFilter:
                "blur(6px)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "20px",
            }}
          >
            <div
              className="animate-modal"
              style={{
                width: "100%",
                maxWidth:
                  "520px",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto",
                background:
                  "#fff",
                borderRadius:
                  "20px",
                padding:
                  "24px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "20px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                  }}
                >
                  <Receipt
                    size={22}
                  />

                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        "21px",
                    }}
                  >
                    Чек
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setShowReceiptModal(
                      false
                    )
                  }
                  style={{
                    width: "36px",
                    height:
                      "36px",
                    border:
                      "none",
                    borderRadius:
                      "9px",
                    background:
                      "#f1f5f9",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  padding: "14px",
                  background:
                    "#f8fafc",
                  borderRadius:
                    "12px",
                  marginBottom:
                    "15px",
                  fontSize:
                    "13px",
                }}
              >
                <div>
                  Номер:{" "}
                  <strong>
                    {
                      lastOrder.orderId
                    }
                  </strong>
                </div>

                <div
                  style={{
                    marginTop:
                      "5px",
                    color:
                      "#64748b",
                  }}
                >
                  {
                    lastOrder.date
                  }
                </div>

                {lastOrder.salesperson && (
                  <div
                    style={{
                      marginTop:
                        "7px",
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
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                      padding:
                        "10px 0",
                      borderBottom:
                        "1px solid #e2e8f0",
                      fontSize:
                        "13px",
                    }}
                  >
                    <div>
                      {item.name} ×{" "}
                      {
                        item.quantity
                      }
                    </div>

                    <strong>
                      {formatMoney(
                        Number(
                          item.price ||
                            0
                        ) *
                          item.quantity
                      )}
                    </strong>
                  </div>
                )
              )}

              <div
                style={{
                  marginTop:
                    "15px",
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    fontSize:
                      "13px",
                    color:
                      "#64748b",
                  }}
                >
                  <span>
                    Подытог
                  </span>

                  <span>
                    {formatMoney(
                      lastOrder.subtotal
                    )}
                  </span>
                </div>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    marginTop:
                      "12px",
                    fontSize:
                      "22px",
                    fontWeight:
                      800,
                  }}
                >
                  <span>
                    Итого
                  </span>

                  <span>
                    {formatMoney(
                      lastOrder.total
                    )}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop:
                    "18px",
                  paddingTop:
                    "15px",
                  borderTop:
                    "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                    marginBottom:
                      "8px",
                  }}
                >
                  Оплата
                </div>

                {Object.entries(
                  lastOrder.payments
                ).map(
                  ([method, amount]) => {
                    if (!amount) {
                      return null;
                    }

                    const labels = {
                      cash: "Наличные",
                      card: "Карта",
                      credit:
                        "Кредит",
                      delivery:
                        "Аманат",
                    };

                    return (
                      <div
                        key={
                          method
                        }
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          fontSize:
                            "13px",
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
                            amount
                          )}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              <button
                onClick={() =>
                  setShowReceiptModal(
                    false
                  )
                }
                style={{
                  width: "100%",
                  height:
                    "44px",
                  marginTop:
                    "20px",
                  border:
                    "none",
                  borderRadius:
                    "10px",
                  background:
                    "#0f172a",
                  color:
                    "#fff",
                  fontWeight:
                    700,
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