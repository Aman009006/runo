import React, { useMemo, useState } from "react";

import {
  Search,
  X,
  RefreshCw,
  Trash2,
  Minus,
  Plus,
  PackageX,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import API_URL from "./config.js";

const STORE_ID = "40b43662-2117-11f1-0a80-1cb200302c3c";

const getItemId = (item) => {
  return (
    item.id ||
    item.productId ||
    item.assortmentId ||
    item.meta?.href?.split("/").pop() ||
    ""
  );
};

const getItemType = (item) => {
  if (item.type) {
    return String(item.type).toLowerCase();
  }

  if (item.meta?.type) {
    return String(item.meta.type).toLowerCase();
  }

  if (item.assortmentMeta?.type) {
    return String(item.assortmentMeta.type).toLowerCase();
  }

  return "product";
};

const getItemName = (item) => {
  return (
    item.name ||
    item.pathName ||
    item.article ||
    item.code ||
    "Без названия"
  );
};

const getStock = (item) => {
  const stock = Number(item.stock);

  if (!Number.isFinite(stock) || stock < 0) {
    return 0;
  }

  return stock;
};

const getSearchText = (item) => {
  return [
    item.name,
    item.code,
    item.article,
    item.barcode,
    item.pathName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export default function WriteOff({
  isOpen,
  products = [],
  loading = false,
  error = "",
  onRefresh,
  onClose,
  onSuccess,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const categories = useMemo(() => {
    const values = products
      .map((item) => item.pathName)
      .filter(Boolean)
      .map((value) => String(value));

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, "ru")
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        getSearchText(item).includes(normalizedSearch);

      const matchesCategory =
        !category || String(item.pathName || "") === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const selectedIds = useMemo(() => {
    return new Set(
      selectedItems.map((item) => getItemId(item))
    );
  }, [selectedItems]);

  const totalQuantity = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [selectedItems]);

  if (!isOpen) {
    return null;
  }

  const addProduct = (product) => {
    const id = getItemId(product);

    if (!id) {
      return;
    }

    const stock = getStock(product);

    if (stock <= 0) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");

    setSelectedItems((current) => {
      const existing = current.find(
        (item) => getItemId(item) === id
      );

      if (existing) {
        return current.map((item) => {
          if (getItemId(item) !== id) {
            return item;
          }

          const currentQuantity = Number(item.quantity || 0);

          return {
            ...item,
            quantity: Math.min(
              currentQuantity + 1,
              stock
            ),
          };
        });
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  const removeProduct = (id) => {
    setSelectedItems((current) =>
      current.filter((item) => getItemId(item) !== id)
    );
  };

  const changeQuantity = (id, delta) => {
    setSelectedItems((current) =>
      current
        .map((item) => {
          if (getItemId(item) !== id) {
            return item;
          }

          const stock = getStock(item);
          const currentQuantity = Number(item.quantity || 0);

          const nextQuantity = Math.min(
            Math.max(currentQuantity + delta, 0),
            stock
          );

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter(
          (item) => Number(item.quantity || 0) > 0
        )
    );
  };

  const setQuantity = (id, value) => {
    setSelectedItems((current) =>
      current
        .map((item) => {
          if (getItemId(item) !== id) {
            return item;
          }

          const stock = getStock(item);

          let nextQuantity = Number(value);

          if (!Number.isFinite(nextQuantity)) {
            nextQuantity = 0;
          }

          nextQuantity = Math.floor(nextQuantity);
          nextQuantity = Math.max(0, nextQuantity);
          nextQuantity = Math.min(nextQuantity, stock);

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter(
          (item) => Number(item.quantity || 0) > 0
        )
    );
  };

  const clearAll = () => {
    setSelectedItems([]);
    setReason("");
    setSubmitError("");
    setSuccessMessage("");
  };

  const handleSubmit = async () => {
    if (saving) {
      return;
    }

    if (selectedItems.length === 0) {
      setSubmitError(
        "Добавьте хотя бы один товар для списания."
      );
      return;
    }

    const validItems = selectedItems
      .map((item) => ({
        id: getItemId(item),
        name: getItemName(item),
        quantity: Math.floor(
          Number(item.quantity || 0)
        ),
        type: getItemType(item),
        assortmentMeta:
          item.meta ||
          item.assortmentMeta ||
          null,
      }))
      .filter(
        (item) =>
          item.id &&
          item.quantity > 0
      );

    if (validItems.length === 0) {
      setSubmitError(
        "Нет товаров с корректным количеством."
      );
      return;
    }

    setSaving(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/moysklad/writeoffs`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
            items: validItems,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Не удалось создать списание."
        );
      }

      setSuccessMessage(
        data?.message ||
          "Списание успешно создано."
      );

      setSelectedItems([]);
      setReason("");

      if (typeof onSuccess === "function") {
        await onSuccess(data);
      } else if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (requestError) {
      console.error(
        "Ошибка создания списания:",
        requestError
      );

      setSubmitError(
        requestError?.message ||
          "Не удалось создать списание."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="writeoff-overlay"
      style={styles.overlay}
    >
      <div
        className="writeoff-modal"
        style={styles.modal}
      >
        <div
          className="writeoff-header"
          style={styles.header}
        >
          <div style={styles.headerTitle}>
            <div
              className="writeoff-header-icon"
              style={styles.headerIcon}
            >
              <PackageX size={22} />
            </div>

            <div>
              <div
                className="writeoff-title"
                style={styles.title}
              >
                Списание
              </div>

              <div
                className="writeoff-subtitle"
                style={styles.subtitle}
              >
                Списание товаров со склада
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="writeoff-close-button"
            style={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="writeoff-content"
          style={styles.content}
        >
          <div
            className="writeoff-left"
            style={styles.left}
          >
            <div
              className="writeoff-toolbar"
              style={styles.toolbar}
            >
              <div
                className="writeoff-search-wrapper"
                style={styles.searchWrapper}
              >
                <Search
                  size={18}
                  style={styles.searchIcon}
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Поиск товара..."
                  className="writeoff-search"
                  style={styles.search}
                />
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="writeoff-refresh-button"
                style={{
                  ...styles.refreshButton,
                  ...(loading
                    ? styles.disabledButton
                    : {}),
                }}
              >
                <RefreshCw
                  size={17}
                  style={
                    loading
                      ? styles.spinning
                      : undefined
                  }
                />

                <span className="writeoff-refresh-text">
                  Обновить
                </span>
              </button>
            </div>

            <div
              className="writeoff-categories"
              style={styles.categories}
            >
              <button
                type="button"
                onClick={() => setCategory("")}
                style={{
                  ...styles.categoryButton,
                  ...(category === ""
                    ? styles.categoryButtonActive
                    : {}),
                }}
              >
                Все
              </button>

              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  style={{
                    ...styles.categoryButton,
                    ...(category === item
                      ? styles.categoryButtonActive
                      : {}),
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            {error ? (
              <div
                className="writeoff-error-box"
                style={styles.errorBox}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <div
              className="writeoff-products"
              style={styles.products}
            >
              {loading ? (
                <div style={styles.empty}>
                  Загрузка товаров...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={styles.empty}>
                  Товары не найдены
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const id = getItemId(product);
                  const stock = getStock(product);
                  const selected = selectedIds.has(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        addProduct(product)
                      }
                      disabled={stock <= 0}
                      className={`writeoff-product-card${
                        selected
                          ? " writeoff-product-card-selected"
                          : ""
                      }${
                        stock <= 0
                          ? " writeoff-product-card-disabled"
                          : ""
                      }`}
                      style={{
                        ...styles.productCard,
                        ...(selected
                          ? styles.productCardSelected
                          : {}),
                        ...(stock <= 0
                          ? styles.productCardDisabled
                          : {}),
                      }}
                    >
                      <div
                        className="writeoff-product-name"
                        style={styles.productName}
                      >
                        {getItemName(product)}
                      </div>

                      {product.article ? (
                        <div
                          style={styles.productMeta}
                        >
                          Артикул: {product.article}
                        </div>
                      ) : null}

                      {product.code ? (
                        <div
                          style={styles.productMeta}
                        >
                          Код: {product.code}
                        </div>
                      ) : null}

                      <div
                        className="writeoff-stock"
                        style={{
                          ...styles.stock,
                          ...(stock <= 0
                            ? styles.stockEmpty
                            : {}),
                        }}
                      >
                        Остаток: {stock}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="writeoff-right"
            style={styles.right}
          >
            <div
              className="writeoff-cart-header"
              style={styles.cartHeader}
            >
              <div>
                <div style={styles.cartTitle}>
                  К списанию
                </div>

                <div style={styles.cartSubtitle}>
                  Позиций: {selectedItems.length} ·
                  Количество: {totalQuantity}
                </div>
              </div>

              {selectedItems.length > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  style={styles.clearButton}
                >
                  <Trash2 size={15} />
                  <span>Очистить</span>
                </button>
              ) : null}
            </div>

            <div
              className="writeoff-selected-list"
              style={styles.selectedList}
            >
              {selectedItems.length === 0 ? (
                <div style={styles.emptyCart}>
                  <div style={styles.emptyCartIcon}>
                    <PackageX size={34} />
                  </div>

                  <div style={styles.emptyCartTitle}>
                    Выберите товары
                  </div>

                  <span style={styles.emptyCartText}>
                    Нажмите на товар слева,
                    чтобы добавить его
                  </span>
                </div>
              ) : (
                selectedItems.map((item) => {
                  const id = getItemId(item);
                  const stock = getStock(item);
                  const quantity = Number(
                    item.quantity || 0
                  );

                  return (
                    <div
                      key={id}
                      className="writeoff-selected-item"
                      style={styles.selectedItem}
                    >
                      <div
                        className="writeoff-selected-info"
                        style={styles.selectedInfo}
                      >
                        <div
                          className="writeoff-selected-name"
                          style={styles.selectedName}
                        >
                          {getItemName(item)}
                        </div>

                        <div
                          style={styles.selectedStock}
                        >
                          Остаток: {stock}
                        </div>
                      </div>

                      <div
                        className="writeoff-quantity"
                        style={styles.quantity}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(id, -1)
                          }
                          style={styles.quantityButton}
                        >
                          <Minus size={15} />
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={stock}
                          value={quantity}
                          onChange={(event) =>
                            setQuantity(
                              id,
                              event.target.value
                            )
                          }
                          className="writeoff-quantity-input"
                          style={styles.quantityInput}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(id, 1)
                          }
                          disabled={quantity >= stock}
                          style={{
                            ...styles.quantityButton,
                            ...(quantity >= stock
                              ? styles.quantityButtonDisabled
                              : {}),
                          }}
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeProduct(id)
                        }
                        className="writeoff-remove-button"
                        style={styles.removeButton}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div
              className="writeoff-bottom"
              style={styles.bottom}
            >
              <label style={styles.label}>
                Причина списания
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="Например: брак, потеря, повреждение..."
                rows={3}
                className="writeoff-textarea"
                style={styles.textarea}
              />

              {submitError ? (
                <div
                  className="writeoff-submit-error"
                  style={styles.submitError}
                >
                  <AlertCircle size={17} />
                  <span>{submitError}</span>
                </div>
              ) : null}

              {successMessage ? (
                <div
                  className="writeoff-success"
                  style={styles.success}
                >
                  <CheckCircle2 size={17} />
                  <span>{successMessage}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  selectedItems.length === 0
                }
                className="writeoff-submit-button"
                style={{
                  ...styles.submitButton,
                  ...(saving ||
                  selectedItems.length === 0
                    ? styles.submitButtonDisabled
                    : {}),
                }}
              >
                <PackageX size={18} />

                {saving
                  ? "Создание списания..."
                  : `Списать товары (${totalQuantity})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes writeoff-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .writeoff-modal {
            width: min(1100px, 100%) !important;
          }

          .writeoff-content {
            grid-template-columns: minmax(0, 1fr) 360px !important;
          }

          .writeoff-products {
            grid-template-columns:
              repeat(auto-fill, minmax(180px, 1fr)) !important;
          }
        }

        @media (max-width: 850px) {
          .writeoff-overlay {
            padding: 10px !important;
          }

          .writeoff-modal {
            height: calc(100vh - 20px) !important;
            max-height: calc(100vh - 20px) !important;
            border-radius: 16px !important;
          }

          .writeoff-content {
            display: flex !important;
            flex-direction: column !important;
            overflow-y: auto !important;
          }

          .writeoff-left {
            flex: 0 0 auto !important;
            min-height: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          .writeoff-right {
            flex: 0 0 auto !important;
            min-height: 430px !important;
          }

          .writeoff-products {
            max-height: 360px !important;
            overflow-y: auto !important;
            grid-template-columns:
              repeat(auto-fill, minmax(180px, 1fr)) !important;
          }

          .writeoff-selected-list {
            max-height: 340px !important;
            flex: 0 0 auto !important;
          }
        }

        @media (max-width: 600px) {
          .writeoff-overlay {
            padding: 0 !important;
            align-items: stretch !important;
            justify-content: stretch !important;
          }

          .writeoff-modal {
            width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
          }

          .writeoff-header {
            min-height: 64px !important;
            height: 64px !important;
            padding: 0 12px !important;
            flex-shrink: 0 !important;
          }

          .writeoff-header-icon {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }

          .writeoff-title {
            font-size: 17px !important;
          }

          .writeoff-subtitle {
            font-size: 11px !important;
            margin-top: 2px !important;
          }

          .writeoff-close-button {
            width: 40px !important;
            height: 40px !important;
            border-radius: 10px !important;
          }

          .writeoff-content {
            min-height: 0 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }

          .writeoff-toolbar {
            padding: 10px !important;
            gap: 8px !important;
            flex-direction: row !important;
            align-items: center !important;
          }

          .writeoff-search-wrapper {
            min-width: 0 !important;
          }

          .writeoff-search {
            height: 42px !important;
            font-size: 14px !important;
            padding-left: 39px !important;
          }

          .writeoff-refresh-button {
            width: 42px !important;
            min-width: 42px !important;
            height: 42px !important;
            padding: 0 !important;
            justify-content: center !important;
          }

          .writeoff-refresh-text {
            display: none !important;
          }

          .writeoff-categories {
            padding: 9px 10px !important;
            gap: 6px !important;
            scrollbar-width: none !important;
          }

          .writeoff-categories::-webkit-scrollbar {
            display: none;
          }

          .writeoff-categories button {
            min-height: 34px !important;
            padding: 7px 11px !important;
            font-size: 12px !important;
          }

          .writeoff-error-box {
            margin: 10px !important;
            font-size: 12px !important;
          }

          .writeoff-products {
            padding: 10px !important;
            gap: 8px !important;
            max-height: 330px !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }

          .writeoff-product-card {
            min-height: 118px !important;
            padding: 11px !important;
            border-radius: 11px !important;
          }

          .writeoff-product-name {
            font-size: 13px !important;
            line-height: 1.3 !important;
            margin-bottom: 6px !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            word-break: break-word !important;
          }

          .writeoff-product-card > div {
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
          }

          .writeoff-stock {
            margin-top: 8px !important;
            font-size: 11px !important;
          }

          .writeoff-right {
            min-height: 0 !important;
          }

          .writeoff-cart-header {
            min-height: 62px !important;
            padding: 10px !important;
            gap: 8px !important;
          }

          .writeoff-cart-header > div:first-child {
            min-width: 0 !important;
          }

          .writeoff-cart-header > div:first-child > div:first-child {
            font-size: 15px !important;
          }

          .writeoff-cart-header > div:first-child > div:last-child {
            font-size: 11px !important;
          }

          .writeoff-clear-button {
            flex-shrink: 0 !important;
          }

          .writeoff-selected-list {
            max-height: 310px !important;
            padding: 8px !important;
          }

          .writeoff-selected-item {
            grid-template-columns:
              minmax(0, 1fr) auto !important;
            grid-template-areas:
              "info remove"
              "quantity quantity" !important;
            gap: 9px !important;
            padding: 10px !important;
            margin-bottom: 7px !important;
            border-radius: 10px !important;
          }

          .writeoff-selected-info {
            grid-area: info !important;
            min-width: 0 !important;
          }

          .writeoff-selected-name {
            font-size: 13px !important;
            line-height: 1.3 !important;
            overflow-wrap: anywhere !important;
          }

          .writeoff-quantity {
            grid-area: quantity !important;
            width: 100% !important;
            justify-content: center !important;
            gap: 5px !important;
          }

          .writeoff-quantity button {
            width: 36px !important;
            height: 36px !important;
            border-radius: 8px !important;
          }

          .writeoff-quantity-input {
            width: 58px !important;
            height: 36px !important;
            font-size: 14px !important;
          }

          .writeoff-remove-button {
            grid-area: remove !important;
            width: 36px !important;
            height: 36px !important;
            border-radius: 8px !important;
          }

          .writeoff-bottom {
            padding: 10px !important;
            flex-shrink: 0 !important;
          }

          .writeoff-textarea {
            min-height: 68px !important;
            max-height: 110px !important;
            font-size: 13px !important;
            margin-bottom: 8px !important;
          }

          .writeoff-submit-error,
          .writeoff-success {
            margin-bottom: 8px !important;
            padding: 8px 9px !important;
            font-size: 11px !important;
          }

          .writeoff-submit-button {
            height: 46px !important;
            font-size: 13px !important;
            border-radius: 10px !important;
          }

          .writeoff-empty-cart {
            min-height: 180px !important;
          }
        }

        @media (max-width: 380px) {
          .writeoff-header {
            padding: 0 10px !important;
          }

          .writeoff-header-icon {
            width: 35px !important;
            height: 35px !important;
          }

          .writeoff-title {
            font-size: 16px !important;
          }

          .writeoff-subtitle {
            display: none !important;
          }

          .writeoff-products {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            padding: 8px !important;
          }

          .writeoff-product-card {
            min-height: 110px !important;
            padding: 9px !important;
          }

          .writeoff-product-name {
            font-size: 12px !important;
          }

          .writeoff-cart-header {
            padding: 9px !important;
          }

          .writeoff-selected-list {
            padding: 7px !important;
          }

          .writeoff-selected-item {
            padding: 9px !important;
          }

          .writeoff-bottom {
            padding: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  modal: {
    width: "min(1500px, 100%)",
    height: "min(900px, 95vh)",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
    color: "#0f172a",
  },

  header: {
    minHeight: "76px",
    padding: "0 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
  },

  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },

  headerIcon: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: "20px",
    fontWeight: 750,
    color: "#0f172a",
  },

  subtitle: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "13px",
  },

  closeButton: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    border: "none",
    borderRadius: "10px",
    background: "#f1f5f9",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    minHeight: 0,
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 430px",
  },

  left: {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e2e8f0",
    background: "#f8fafc",
  },

  toolbar: {
    display: "flex",
    gap: "10px",
    padding: "16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
  },

  searchWrapper: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },

  searchIcon: {
    position: "absolute",
    left: "13px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    pointerEvents: "none",
  },

  search: {
    width: "100%",
    height: "44px",
    boxSizing: "border-box",
    padding: "0 14px 0 42px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    fontSize: "14px",
  },

  refreshButton: {
    height: "44px",
    padding: "0 15px",
    flexShrink: 0,
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    whiteSpace: "nowrap",
    fontWeight: 600,
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  spinning: {
    animation:
      "writeoff-spin 1s linear infinite",
  },

  categories: {
    padding: "12px 16px",
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    scrollbarWidth: "none",
  },

  categoryButton: {
    flexShrink: 0,
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    background: "#fff",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 550,
  },

  categoryButtonActive: {
    background: "#eff6ff",
    color: "#2563eb",
    borderColor: "#bfdbfe",
    fontWeight: 650,
  },

  errorBox: {
    margin: "12px 16px 0",
    padding: "11px 13px",
    borderRadius: "10px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  },

  products: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "16px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(220px, 1fr))",
    alignContent: "start",
    gap: "12px",
  },

  productCard: {
    minHeight: "125px",
    padding: "15px",
    textAlign: "left",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    transition: "all .15s ease",
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, .03)",
  },

  productCardSelected: {
    borderColor: "#93c5fd",
    background: "#eff6ff",
    boxShadow:
      "0 4px 14px rgba(37, 99, 235, .08)",
  },

  productCardDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },

  productName: {
    fontSize: "14px",
    fontWeight: 650,
    lineHeight: 1.4,
    marginBottom: "8px",
    color: "#0f172a",
  },

  productMeta: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "3px",
  },

  stock: {
    marginTop: "10px",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 650,
  },

  stockEmpty: {
    color: "#dc2626",
  },

  empty: {
    gridColumn: "1 / -1",
    minHeight: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontSize: "14px",
  },

  right: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "#fff",
  },

  cartHeader: {
    minHeight: "72px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
  },

  cartTitle: {
    fontWeight: 750,
    fontSize: "17px",
    color: "#0f172a",
  },

  cartSubtitle: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "12px",
  },

  clearButton: {
    border: "none",
    background: "#fef2f2",
    color: "#dc2626",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "7px 9px",
    borderRadius: "8px",
    flexShrink: 0,
  },

  selectedList: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "12px",
    background: "#f8fafc",
  },

  emptyCart: {
    height: "100%",
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    gap: "9px",
    textAlign: "center",
  },

  emptyCartIcon: {
    width: "62px",
    height: "62px",
    borderRadius: "16px",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },

  emptyCartTitle: {
    color: "#334155",
    fontSize: "15px",
    fontWeight: 650,
  },

  emptyCartText: {
    color: "#94a3b8",
    fontSize: "12px",
    maxWidth: "220px",
    lineHeight: 1.5,
  },

  selectedItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    marginBottom: "8px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    background: "#fff",
    boxShadow:
      "0 2px 7px rgba(15, 23, 42, .03)",
  },

  selectedInfo: {
    minWidth: 0,
  },

  selectedName: {
    fontSize: "13px",
    fontWeight: 650,
    lineHeight: 1.35,
    color: "#0f172a",
  },

  selectedStock: {
    marginTop: "5px",
    fontSize: "11px",
    color: "#64748b",
  },

  quantity: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
  },

  quantityButton: {
    width: "28px",
    height: "28px",
    flexShrink: 0,
    border: "1px solid #e2e8f0",
    borderRadius: "7px",
    background: "#fff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  quantityButtonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },

  quantityInput: {
    width: "42px",
    height: "28px",
    boxSizing: "border-box",
    border: "1px solid #e2e8f0",
    borderRadius: "7px",
    background: "#fff",
    color: "#0f172a",
    textAlign: "center",
    outline: "none",
    fontWeight: 600,
  },

  removeButton: {
    width: "30px",
    height: "30px",
    flexShrink: 0,
    border: "none",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#dc2626",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  bottom: {
    padding: "14px",
    borderTop: "1px solid #e2e8f0",
    background: "#fff",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 600,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    padding: "10px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    fontSize: "13px",
    fontFamily: "inherit",
    marginBottom: "10px",
    minHeight: "76px",
  },

  submitError: {
    padding: "9px 10px",
    marginBottom: "9px",
    borderRadius: "9px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  success: {
    padding: "9px 10px",
    marginBottom: "9px",
    borderRadius: "9px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  submitButton: {
    width: "100%",
    height: "46px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow:
      "0 4px 12px rgba(37, 99, 235, .18)",
  },

  submitButtonDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },
};