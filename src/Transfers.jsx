import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";

import "./transfers.css";

import API_URL from "./config.js";

// const STORE_ID = "40b43662-2117-11f1-0a80-1cb200302c3c";

function Transfers({ onBack }) {
  const [mode, setMode] = useState("outgoing");
  const [receiptSource, setReceiptSource] = useState("branch");

  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [supplierPaymentMethod, setSupplierPaymentMethod] = useState("cash");
  const [items, setItems] = useState([]);

  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [incomingTransfers, setIncomingTransfers] = useState([]);
  const [localTransfers, setLocalTransfers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
const [receivedQuantities, setReceivedQuantities] = useState({});
  const [activeSection, setActiveSection] = useState("create");

  const [supplierTotalAmount, setSupplierTotalAmount] = useState("");

  const currentWarehouse = "Ваш филиал";
  //  const currentWarehouse = useMemo(() => {
  //   return warehouses.find((warehouse) => warehouse.id === STORE_ID);
  // }, [warehouses]);

const otherWarehouses = warehouses

const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter((product) => {
      return [product.name, product.article, product.code, product.barcode]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value));
    });
  }, [products, productSearch]);

const filteredIncoming = useMemo(() => {
  const value = search.trim().toLowerCase();

  const todayKey = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Bishkek",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());

  return incomingTransfers.filter(
    (transfer) => {
      const date = new Date(
        transfer.createdAt,
      );

      if (
        Number.isNaN(date.getTime())
      ) {
        return false;
      }

      const transferDay =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone: "Asia/Bishkek",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          },
        ).format(date);

      // Показываем только сегодняшние отправки
      if (transferDay !== todayKey) {
        return false;
      }

      if (!value) {
        return true;
      }

      return [
        transfer.name,
        transfer.id,
        transfer.fromWarehouse?.name,
        transfer.toWarehouse?.name,

        ...(transfer.items || []).map(
          (item) => item.name,
        ),
      ]
        .filter(Boolean)
        .some((field) =>
          String(field)
            .toLowerCase()
            .includes(value),
        );
    },
  );
}, [incomingTransfers, search]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [items]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("ru-RU").format(amount) + " сом";
  };
  const getReceivedKey = (transferId, assortmentId) => {
  return `${transferId}:${assortmentId}`;
};

const getReceivedValue = (transfer, item) => {
  const key = getReceivedKey(
    transfer.id,
    item.assortmentId,
  );

  // Если пользователь уже менял input
  if (
    Object.prototype.hasOwnProperty.call(
      receivedQuantities,
      key,
    )
  ) {
    return receivedQuantities[key];
  }

  // Если уже было принято раньше — используем сохранённое значение.
  // Для нового перемещения по умолчанию ставим количество отправленного.
  return item.receivedQuantity ?? item.quantity ?? 0;
};

const updateReceivedQuantity = (
  transfer,
  item,
  value,
) => {
  const key = getReceivedKey(
    transfer.id,
    item.assortmentId,
  );

  setReceivedQuantities((prev) => ({
    ...prev,
    [key]: value,
  }));
};
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        warehousesResponse,
        suppliersResponse,
        productsResponse,
        incomingResponse,
        localResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/transfers/warehouses`,{credentials: "include",}),
        fetch(`${API_URL}/api/transfers/suppliers`,{credentials: "include",}),
        fetch(`${API_URL}/api/moysklad/products`, {credentials: "include",}),
        fetch(`${API_URL}/api/transfers/incoming`, {credentials: "include",}),
        fetch(`${API_URL}/api/transfers`, {credentials: "include",}),
      ]);

      const warehousesData = await warehousesResponse.json();
      const suppliersData = await suppliersResponse.json();
      const productsData = await productsResponse.json();
      const incomingData = await incomingResponse.json();
      const localData = await localResponse.json();

      if (!warehousesResponse.ok) {
        throw new Error(
          warehousesData.message || "Не удалось загрузить склады",
        );
      }

      if (!suppliersResponse.ok) {
        throw new Error(
          suppliersData.message || "Не удалось загрузить поставщиков",
        );
      }

      if (!productsResponse.ok) {
        throw new Error(productsData.message || "Не удалось загрузить товары");
      }

      if (!incomingResponse.ok) {
        throw new Error(
          incomingData.message || "Не удалось загрузить входящие перемещения",
        );
      }

      if (!localResponse.ok) {
        throw new Error(
          localData.message || "Не удалось загрузить локальные операции",
        );
      }

      setWarehouses(warehousesData.rows || []);
      setSuppliers(suppliersData.rows || []);
      setProducts(productsData.rows || []);
      setIncomingTransfers(incomingData.rows || []);
      setLocalTransfers(localData.rows || []);

      // if (!selectedWarehouse) {
      //   const firstOther = (warehousesData.rows || []).find(
      //     (warehouse) => warehouse.id !== STORE_ID,
      //   );

      //   if (firstOther) {
      //     setSelectedWarehouse(firstOther.id);
      //   }
      // }
    } catch (err) {
      console.error(err);
      setError(err.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addProduct = (product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Number(item.quantity) + 1,
              }
            : item,
        );
      }

      // Себестоимость товара
      const costPrice = Number(
        product.costPrice ??
          product.cost_price ??
          product.purchasePrice ??
          product.purchase_price ??
          product.price ??
          0,
      );

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          article: product.article || "",
          code: product.code || "",

          // Цена себестоимости
          price: costPrice,

          stock: Number(product.stock || 0),
          quantity: 1,

          assortmentMeta: product.meta,
        },
      ];
    });
  };

  const updatePrice = (productId, price) => {
    const value = Math.max(0, Number(price) || 0);

    setItems((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              price: value,
            }
          : item,
      ),
    );
  };

  const updateQuantity = (productId, quantity) => {
    const value = Math.max(0, Number(quantity) || 0);

    setItems((prev) => {
      if (value === 0) {
        return prev.filter((item) => item.id !== productId);
      }

      return prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: value,
            }
          : item,
      );
    });
  };

  const removeProduct = (productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const resetForm = () => {
    setItems([]);
    setProductSearch("");
    setSelectedSupplier("");
    setSupplierTotalAmount("");
  };

  const createOutgoing = async () => {
    if (!selectedWarehouse) {
      setError("Выберите филиал, куда отправляем товар");
      return;
    }

    if (items.length === 0) {
      setError("Добавьте хотя бы один товар");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/transfers/outgoing`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toWarehouseId: selectedWarehouse,
          items: items.map((item) => ({
            assortmentId: item.id,
            assortmentMeta: item.assortmentMeta,
            name: item.name,
            quantity: Number(item.quantity),
            price: Number(item.price || 0),
            costPrice: Number(item.price || 0),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось оформить отправку");
      }

      alert(
        `Отправка оформлена.\nДокумент МойСклад: ${
          data.moyskladId || "создан"
        }`,
      );

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Не удалось оформить отправку");
    } finally {
      setSaving(false);
    }
  };

  const createSupplierReceipt = async () => {
    if (!selectedSupplier) {
      setError("Выберите поставщика");
      return;
    }

    if (items.length === 0) {
      setError("Добавьте хотя бы один товар");
      return;
    }

    const totalAmount =
      supplierPaymentMethod === "debt" ? 0 : Number(supplierTotalAmount);

    if (
      supplierPaymentMethod === "cash" &&
      (!Number.isFinite(totalAmount) || totalAmount <= 0)
    ) {
      setError("Введите общую сумму прихода");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/transfers/receipt`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          totalAmount,

          paymentMethod: supplierPaymentMethod,

          items: items.map((item) => ({
            assortmentId: item.id,
            assortmentMeta: item.assortmentMeta,
            name: item.name,
            quantity: Number(item.quantity),

            // Оставляем для совместимости с текущим backend,
            // но пользователю эти цены больше не показываем.
            price: Number(item.price || 0),
            costPrice: Number(item.price || 0),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Не удалось оформить приход");
      }

      alert(
        `Приход оформлен.\nДокумент МойСклад: ${data.moyskladId || "создан"}`,
      );

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Не удалось оформить приход");
    } finally {
      setSaving(false);
    }
  };

  const confirmIncoming = async (transfer) => {
  setError("");

  const receivedItems = [];
  const errors = [];

  for (const item of transfer.items || []) {
    const rawValue = getReceivedValue(
      transfer,
      item,
    );

    const sentQuantity = Number(
      item.quantity,
    );

    const receivedQuantity = Number(
      String(rawValue ?? "").replace(",", "."),
    );

    if (
      rawValue === "" ||
      rawValue === null ||
      rawValue === undefined
    ) {
      errors.push(
        `Укажите принятое количество для "${item.name}"`,
      );

      continue;
    }

    if (
      !Number.isFinite(sentQuantity) ||
      sentQuantity < 0
    ) {
      errors.push(
        `Некорректное отправленное количество для "${item.name}"`,
      );

      continue;
    }

    if (
      !Number.isFinite(receivedQuantity) ||
      receivedQuantity < 0
    ) {
      errors.push(
        `Некорректное принятое количество для "${item.name}"`,
      );

      continue;
    }

    if (receivedQuantity > sentQuantity) {
      errors.push(
        `Для "${item.name}" нельзя принять ${receivedQuantity} шт. — отправлено только ${sentQuantity} шт.`,
      );

      continue;
    }

    receivedItems.push({
      assortmentId: item.assortmentId,
      receivedQuantity,
    });
  }

  if (errors.length > 0) {
    setError(errors.join("\n"));
    return;
  }

  const totalSent = (transfer.items || []).reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0,
  );

  const totalReceived = receivedItems.reduce(
    (sum, item) =>
      sum + Number(item.receivedQuantity || 0),
    0,
  );

  const shortage =
    totalSent - totalReceived;

  const confirmText =
    `Перемещение: ${transfer.name || transfer.id}\n\n` +
    `Отправлено: ${totalSent} шт.\n` +
    `Принято: ${totalReceived} шт.\n` +
    `Недостача: ${shortage} шт.\n\n` +
    `Подтвердить получение?`;

  if (!window.confirm(confirmText)) {
    return;
  }

  setSaving(true);

  try {
    const response = await fetch(
      `${API_URL}/api/transfers/${transfer.id}/confirm`,
      {
        method: "POST",
credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          receivedItems,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "Не удалось подтвердить получение",
      );
    }

    // Удаляем временные значения input
    setReceivedQuantities((prev) => {
      const next = { ...prev };

      for (const item of transfer.items || []) {
        delete next[
          getReceivedKey(
            transfer.id,
            item.assortmentId,
          )
        ];
      }

      return next;
    });

    await loadData();
  } catch (err) {
    console.error(err);

    setError(
      err.message ||
        "Не удалось подтвердить получение",
    );
  } finally {
    setSaving(false);
  }
};

  const renderProductSelector = () => {
    return (
      <div className="transfers-product-area">
        <div className="transfers-section-title">
          <div>
            <h3>Товары</h3>
            <p>Выберите товары из МойСклад</p>
          </div>

          <div className="transfers-product-count">
            {products.length} товаров
          </div>
        </div>

        <div className="transfers-search">
          <Search size={18} />

          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Поиск по названию, коду, артикулу..."
          />
        </div>

        <div className="transfers-products-grid">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              className="transfers-product-card"
              onClick={() => addProduct(product)}
              type="button"
            >
              <div className="transfers-product-icon">
                <Package size={20} />
              </div>

              <div className="transfers-product-info">
                <strong>{product.name}</strong>

                <span>
                  {product.article
                    ? `Арт. ${product.article}`
                    : product.code
                      ? `Код ${product.code}`
                      : "Без артикула"}
                </span>

                {/* <small>
  Цена:{" "}
  {formatAmount(
    Number(product.costPrice ?? product.buyPrice ?? product.price ?? 0),
  )}
</small> */}

                <small>Остаток: {product.stock ?? 0}</small>
              </div>

              <Plus size={19} />
            </button>
          ))}

          {!loading && filteredProducts.length === 0 && (
            <div className="transfers-empty">Товары не найдены</div>
          )}
        </div>
      </div>
    );
  };

  const renderSelectedItems = () => {
    return (
      <div className="transfers-cart">
        <div className="transfers-section-title">
          <div>
            <h3>Выбранные товары</h3>
            <p>
              Позиций: {items.length} · Количество: {totalQuantity}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="transfers-empty-cart">
            <Package size={30} />

            <span>Добавьте товары из списка слева</span>
          </div>
        ) : (
          <div className="transfers-selected-list">
            {items.map((item) => (
              <div className="transfers-selected-item" key={item.id}>
                <div className="transfers-selected-info">
                  <strong>{item.name}</strong>
                  {/* 
               {mode === "incoming" && receiptSource === "supplier" && (
  <div className="transfers-supplier-price">
    <label>Цена себестоимости за ед.</label>

    <div className="transfers-price-input">
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.price}
        onChange={(e) => updatePrice(item.id, e.target.value)}
      />

      <span>сом</span>
    </div>

    <span className="transfers-item-total">
      Сумма:{" "}
      {formatAmount(
        Number(item.quantity || 0) * Number(item.price || 0),
      )}
    </span>
  </div>
)} */}

                  <span>Остаток: {item.stock ?? 0}</span>
                </div>

                <div className="transfers-quantity">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, Number(item.quantity) - 1)
                    }
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.id, Number(item.quantity) + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  className="transfers-delete"
                  type="button"
                  onClick={() => removeProduct(item.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOutgoing = () => {
    return (
      <>
        <div className="transfers-form-card">
          <div className="transfers-section-title">
            <div>
              <h3>Отправка товара</h3>
              <p>Перемещение товара с вашего склада в другой филиал</p>
            </div>
          </div>

          <div className="transfers-flow">
            <div className="transfers-select-block">
              <label>Откуда</label>

              <div className="transfers-static-select">
                <Warehouse size={18} />

                <div>
                  <strong>{currentWarehouse?.name || "Ваш филиал"}</strong>

                  <span>Текущий склад</span>
                </div>
              </div>
            </div>

            <ArrowRight className="transfers-flow-arrow" size={25} />

            <div className="transfers-select-block">
              <label>Куда отправляем</label>

              <div className="transfers-select">
                <Warehouse size={18} />

                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                  <option value="">Выберите филиал</option>

                  {otherWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>

                <ChevronDown size={17} />
              </div>
            </div>
          </div>
        </div>

        <div className="transfers-content-grid">
          {renderProductSelector()}
          {renderSelectedItems()}
        </div>

        <div className="transfers-footer">
          <div>
            <strong>{items.length} позиций</strong>

            <span>Количество: {totalQuantity}</span>
          </div>

          <button
            className="transfers-primary-button"
            disabled={saving || items.length === 0 || !selectedWarehouse}
            onClick={createOutgoing}
          >
            {saving ? (
              <>
                <Loader2 className="spin" size={18} />
                Оформление...
              </>
            ) : (
              <>
                <ArrowUpFromLine size={18} />
                Оформить отправку
              </>
            )}
          </button>
        </div>
      </>
    );
  };

const renderBranchReceipt = () => {
  return (
    <>
      <div className="transfers-info-card">
        <div className="transfers-info-icon">
          <Truck size={20} />
        </div>

        <div>
          <strong>
            Приход от другого филиала
          </strong>

          <span>
            Здесь отображаются перемещения,
            которые были отправлены на ваш
            склад сегодня. Укажите фактически
            принятое количество по каждому товару.
          </span>
        </div>
      </div>

      <div className="transfers-history-toolbar">
        <div className="transfers-search">
          <Search size={18} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Поиск перемещения или товара..."
          />
        </div>

        <button
          className="transfers-refresh-button"
          type="button"
          onClick={loadData}
          disabled={loading || saving}
        >
          <RefreshCw
            size={17}
            className={
              loading ? "spin" : ""
            }
          />

          Обновить
        </button>
      </div>

      <div className="transfers-history">
        {filteredIncoming.map(
          (transfer) => {
            const totalSent =
              (transfer.items || []).reduce(
                (sum, item) =>
                  sum +
                  Number(
                    item.quantity || 0,
                  ),
                0,
              );

            const totalReceived =
              (transfer.items || []).reduce(
                (sum, item) => {
                  const value =
                    Number(
                      String(
                        getReceivedValue(
                          transfer,
                          item,
                        ) ?? "",
                      ).replace(",", "."),
                    );

                  return (
                    sum +
                    (Number.isFinite(
                      value,
                    )
                      ? value
                      : 0)
                  );
                },
                0,
              );

            const shortage = Math.max(
              0,
              totalSent -
                totalReceived,
            );

            return (
              <div
                className="transfers-history-item transfers-incoming-card"
                key={transfer.id}
              >
                <div className="transfers-history-main">
                  <div className="transfers-history-icon">
                    <ArrowDownToLine
                      size={20}
                    />
                  </div>

                  <div>
                    <strong>
                      {transfer.name ||
                        `Перемещение ${transfer.id}`}
                    </strong>

                    <span>
                      {transfer.fromWarehouse
                        ?.name ||
                        "Неизвестный склад"}

                      {" → "}

                      {transfer.toWarehouse
                        ?.name ||
                        "Ваш склад"}
                    </span>

                    <small>
                      {transfer.items
                        ?.length || 0}{" "}
                      позиций · Отправлено:{" "}
                      {totalSent} шт.
                    </small>
                  </div>
                </div>

                <div className="transfers-received-table">
                  <div className="transfers-received-table-header">
                    <span>
                      Товар
                    </span>

                    <span>
                      Отправлено
                    </span>

                    <span>
                      Принято
                    </span>
                  </div>

                  {(transfer.items ||
                    []).map(
                    (item) => {
                      const sentQuantity =
                        Number(
                          item.quantity ||
                            0,
                        );

                      const receivedValue =
                        getReceivedValue(
                          transfer,
                          item,
                        );

                      return (
                        <div
                          className="transfers-received-table-row"
                          key={`${transfer.id}-${item.assortmentId}`}
                        >
                          <div className="transfers-received-product">
                            <strong>
                              {item.name}
                            </strong>
                          </div>

                          <div className="transfers-received-sent">
                            {sentQuantity}{" "}
                            шт.
                          </div>

                          <div className="transfers-received-input-wrap">
                            <input
                              className="transfers-received-input"
                              type="number"
                              min="0"
                              max={
                                sentQuantity
                              }
                              step="1"
                              value={
                                receivedValue
                              }
                              onChange={(
                                e,
                              ) =>
                                updateReceivedQuantity(
                                  transfer,
                                  item,
                                  e.target
                                    .value,
                                )
                              }
                              disabled={
                                saving
                              }
                            />

                            <span>
                              шт.
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="transfers-received-footer">
                  <div className="transfers-received-summary">
                    <span>
                      Отправлено:{" "}
                      {totalSent} шт.
                    </span>

                    <span>
                      Принято:{" "}
                      {totalReceived} шт.
                    </span>

                    <span>
                      Недостача:{" "}
                      {shortage} шт.
                    </span>
                  </div>

                  <button
                    className="transfers-confirm-button"
                    type="button"
                    disabled={
                      saving ||
                      !(
                        transfer.items ||
                        []
                      ).length
                    }
                    onClick={() =>
                      confirmIncoming(
                        transfer,
                      )
                    }
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={17}
                          className="spin"
                        />

                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Check
                          size={17}
                        />

                        Принять перемещение
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          },
        )}

        {!loading &&
          filteredIncoming.length ===
            0 && (
            <div className="transfers-empty-history">
              Сегодня входящих перемещений
              нет
            </div>
          )}
      </div>
    </>
  );
};

  const renderSupplierReceipt = () => {
    return (
      <>
        <div className="transfers-form-card">
          <div className="transfers-section-title">
            <div>
              <h3>Приход от поставщика</h3>

              <p>Фактически полученные товары заносятся на ваш склад</p>
            </div>
          </div>

          <div className="transfers-select-block">
            <label>Поставщик</label>

            <div className="transfers-select">
              <UserRound size={18} />

              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">Выберите поставщика</option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <ChevronDown size={17} />
            </div>
          </div>
        </div>

        <div className="transfers-content-grid">
          {renderProductSelector()}
          {renderSelectedItems()}
        </div>

        <div className="transfers-footer">
          <div>
            <strong>{items.length} позиций</strong>

            <span>Количество: {totalQuantity}</span>
          </div>

          {supplierPaymentMethod === "cash" && (
            <div className="transfers-total-input">
              <label>Общая сумма прихода</label>

              <div className="transfers-price-input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={supplierTotalAmount}
                  onChange={(e) => setSupplierTotalAmount(e.target.value)}
                  placeholder="Введите сумму"
                />

                <span>сом</span>
              </div>
            </div>
          )}

          <div className="transfers-payment-select">
            <select
              value={supplierPaymentMethod}
              onChange={(e) => setSupplierPaymentMethod(e.target.value)}
              className="transfers-primary-button"
            >
              <option value="cash">Оплатили наличкой</option>
              <option value="debt">За счёт долга</option>
            </select>
          </div>

          <button
            className="transfers-primary-button"
            disabled={
              saving ||
              items.length === 0 ||
              !selectedSupplier ||
              (supplierPaymentMethod === "cash" &&
                (!supplierTotalAmount || Number(supplierTotalAmount) <= 0))
            }
            onClick={createSupplierReceipt}
          >
            {saving ? (
              <>
                <Loader2 className="spin" size={18} />
                Оформление...
              </>
            ) : (
              <>
                <ArrowDownToLine size={18} />
                Оформить приход
              </>
            )}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="transfers-page">
      <div className="transfers-container">
        <header className="transfers-header">
          <div className="transfers-header-left">
            <button
              className="transfers-back-button"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1>Отправка / Приход</h1>

              <p>Перемещение товаров между филиалами и приход от поставщиков</p>
            </div>
          </div>

          <button
            className="transfers-refresh-button"
            type="button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            Обновить
          </button>
        </header>

        {error && (
          <div className="transfers-error">
            <span>{error}</span>

            <button type="button" onClick={() => setError("")}>
              Закрыть
            </button>
          </div>
        )}

        <div className="transfers-mode-tabs">
          <button
            className={mode === "outgoing" ? "active" : ""}
            onClick={() => {
              setMode("outgoing");
              setActiveSection("create");
              setError("");
            }}
            type="button"
          >
            <ArrowUpFromLine size={19} />
            Отправка
          </button>

          <button
            className={mode === "incoming" ? "active" : ""}
            onClick={() => {
              setMode("incoming");
              setActiveSection("create");
              setError("");
            }}
            type="button"
          >
            <ArrowDownToLine size={19} />
            Приход
          </button>
        </div>

        {mode === "incoming" && (
          <div className="transfers-subtabs">
            <button
              className={receiptSource === "branch" ? "active" : ""}
              onClick={() => {
                setReceiptSource("branch");
                setItems([]);
                setError("");
              }}
              type="button"
            >
              <Warehouse size={17} />
              От филиала
            </button>

            <button
              className={receiptSource === "supplier" ? "active" : ""}
              onClick={() => {
                setReceiptSource("supplier");
                setItems([]);
                setError("");
              }}
              type="button"
            >
              <UserRound size={17} />
              От поставщика
            </button>
          </div>
        )}

        {loading ? (
          <div className="transfers-loading">
            <Loader2 size={30} className="spin" />
            <span>Загрузка данных МойСклад...</span>
          </div>
        ) : (
          <>
            {mode === "outgoing" && renderOutgoing()}

            {mode === "incoming" &&
              receiptSource === "branch" &&
              renderBranchReceipt()}

            {mode === "incoming" &&
              receiptSource === "supplier" &&
              renderSupplierReceipt()}
          </>
        )}
      </div>
    </div>
  );
}

export default Transfers;
