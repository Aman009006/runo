import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Layers,
  Images,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  ImagePlus,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import API_URL from "./config.js";
import { adminPass } from "./config.js";


import "./ShopAdmin.css";

const EMPTY_PRODUCT = {
  title: "",
  titleKg: "",
  category: "",
  price: "",
  oldPrice: "",
  badge: "",
  rating: 5,
  filling: "",
  reviews: 0,
  image: "",
  images: [],
  description: "",
  descriptionKg: "",
  bedType: "",
  season: "",
};

const EMPTY_CATEGORY = {
  id: "",
  name: "",
  nameKg: "",
};

const EMPTY_SLIDE = {
  title: "",
  titleKg: "",
  description: "",
  descriptionKg: "",
  image: "",
  imageAlt: "",
  floatingTitle: "",
  floatingTitleKg: "",
  floatingText: "",
  floatingTextKg: "",
  link: "/",
};

export default function ShopAdmin() {
  const [activeTab, setActiveTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [slides, setSlides] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY);
  const [slideForm, setSlideForm] = useState(EMPTY_SLIDE);
  const [imagesText, setImagesText] = useState("");

const [isAuthenticated, setIsAuthenticated] = useState(false);
const [password, setPassword] = useState("");
const [loginError, setLoginError] = useState("");

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_URL}/api/shop${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || result.error || "Ошибка запроса");
    }

    return result;
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [productsResult, categoriesResult, slidesResult] =
        await Promise.all([
          request("/products"),
          request("/categories"),
          request("/slides"),
        ]);

      setProducts(
        Array.isArray(productsResult.data) ? productsResult.data : []
      );

      setCategories(
        Array.isArray(categoriesResult.data) ? categoriesResult.data : []
      );

      setSlides(
        Array.isArray(slidesResult.data) ? slidesResult.data : []
      );
    } catch (err) {
      setError(err.message || "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openProductModal = (product = null) => {
    if (product) {
      setEditingId(product.id);

      setProductForm({
        ...EMPTY_PRODUCT,
        ...product,
        images: Array.isArray(product.images) ? product.images : [],
        filling: product.filling || "",
        season: product.season || "",
        bedType: product.bedType || "",
      });

      setImagesText(
        (Array.isArray(product.images) ? product.images : []).join("\n")
      );
    } else {
      setEditingId(null);

      setProductForm({
        ...EMPTY_PRODUCT,
        category: categories.find((item) => item.id !== "all")?.id || "",
      });

      setImagesText("");
    }

    setError("");
    setModal("product");
  };

  const openCategoryModal = (category = null) => {
    setEditingId(category?.id || null);

    setCategoryForm(
      category
        ? { ...EMPTY_CATEGORY, ...category }
        : { ...EMPTY_CATEGORY }
    );

    setError("");
    setModal("category");
  };

  const openSlideModal = (slide = null) => {
    setEditingId(slide?.id || null);

    setSlideForm(
      slide
        ? { ...EMPTY_SLIDE, ...slide }
        : { ...EMPTY_SLIDE }
    );

    setError("");
    setModal("slide");
  };

  const closeModal = () => {
    if (saving) return;

    setModal(null);
    setEditingId(null);
    setError("");
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    const images = imagesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const primaryImage = productForm.image.trim() || images[0] || "";

    const payload = {
      ...productForm,
      title: productForm.title.trim(),
      titleKg: productForm.titleKg.trim(),
      category: productForm.category,
      bedType: productForm.bedType || "",
      price: Number(productForm.price),
      filling: productForm.filling || "",
      season: productForm.season || "",
      oldPrice:
        productForm.oldPrice === ""
          ? undefined
          : Number(productForm.oldPrice),
      badge: productForm.badge.trim(),
      rating: Number(productForm.rating),
      reviews: Number(productForm.reviews),
      image: primaryImage,
      images: images.length
        ? images
        : primaryImage
        ? [primaryImage]
        : [],
      description: productForm.description.trim(),
      descriptionKg: productForm.descriptionKg.trim(),
    };

    try {
      if (editingId) {
        const result = await request(
          `/products/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setProducts((prev) =>
          prev.map((item) =>
            item.id === editingId ? result.data : item
          )
        );
      } else {
        const result = await request("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setProducts((prev) => [...prev, result.data]);
      }

      setModal(null);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdminLogin = (event) => {
  event.preventDefault();

  if (password === String(adminPass)) {
    setIsAuthenticated(true);
    setPassword("");
    setLoginError("");
  } else {
    setLoginError("Неверный пароль. Попробуйте ещё раз.");
    setPassword("");
  }
};

  const saveCategory = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      ...categoryForm,
      id: categoryForm.id.trim() || undefined,
      name: categoryForm.name.trim(),
      nameKg: categoryForm.nameKg.trim(),
    };

    try {
      if (editingId) {
        const result = await request(
          `/categories/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setCategories((prev) =>
          prev.map((item) =>
            item.id === editingId ? result.data : item
          )
        );
      } else {
        const result = await request("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setCategories((prev) => [...prev, result.data]);
      }

      setModal(null);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSlide = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      ...slideForm,
      title: slideForm.title.trim(),
      titleKg: slideForm.titleKg.trim(),
      description: slideForm.description.trim(),
      descriptionKg: slideForm.descriptionKg.trim(),
      image: slideForm.image.trim(),
      imageAlt: slideForm.imageAlt.trim(),
      floatingTitle: slideForm.floatingTitle.trim(),
      floatingTitleKg: slideForm.floatingTitleKg.trim(),
      floatingText: slideForm.floatingText.trim(),
      floatingTextKg: slideForm.floatingTextKg.trim(),
      link: slideForm.link.trim() || "/",
    };

    try {
      if (editingId) {
        const result = await request(
          `/slides/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setSlides((prev) =>
          prev.map((item) =>
            item.id === editingId ? result.data : item
          )
        );
      } else {
        const result = await request("/slides", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSlides((prev) => [...prev, result.data]);
      }

      setModal(null);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (type, item) => {
    const names = {
      products: "товар",
      categories: "категорию",
      slides: "слайд",
    };

    if (
      !window.confirm(
        `Удалить ${names[type]} «${item.title || item.name}»?`
      )
    ) {
      return;
    }

    try {
      setError("");

      await request(`/${type}/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });

      if (type === "products") {
        setProducts((prev) =>
          prev.filter((x) => x.id !== item.id)
        );
      }

      if (type === "categories") {
        setCategories((prev) =>
          prev.filter((x) => x.id !== item.id)
        );
      }

      if (type === "slides") {
        setSlides((prev) =>
          prev.filter((x) => x.id !== item.id)
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase();

    return (
      product.title?.toLowerCase().includes(query) ||
      product.titleKg?.toLowerCase().includes(query)
    );
  });

  const filteredCategories = categories.filter((category) => {
    const query = search.toLowerCase();

    return (
      category.name?.toLowerCase().includes(query) ||
      category.nameKg?.toLowerCase().includes(query)
    );
  });

  const filteredSlides = slides.filter((slide) => {
    const query = search.toLowerCase();

    return (
      slide.title?.toLowerCase().includes(query) ||
      slide.titleKg?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (price) =>
    `${Number(price || 0).toLocaleString("ru-RU")} сом`;

  if (!isAuthenticated) {
  return (
    <div className="shop-admin-login">
      <form
        className="shop-admin-login-card"
        onSubmit={handleAdminLogin}
      >
        <div className="shop-admin-logo">R</div>

        <h1>RUNO</h1>
        <p>Вход в панель управления</p>

        <label>
          Пароль администратора
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            autoComplete="current-password"
            autoFocus
          />
        </label>

        {loginError && (
          <div className="shop-admin-error">
            {loginError}
          </div>
        )}

        <button type="submit" disabled={!password.trim()}>
          Войти
        </button>

        <a href="/">Вернуться в магазин</a>
      </form>
    </div>
  );
}

  return (
    <div className="shop-admin">
      <aside className="shop-admin-sidebar">
        <div className="shop-admin-brand">
          <div className="shop-admin-logo">R</div>
          <div>
            <strong>RUNO</strong>
            <span>Панель управления</span>
          </div>
        </div>

        <div className="shop-admin-menu-title">
          УПРАВЛЕНИЕ МАГАЗИНОМ
        </div>

        <button
          className={activeTab === "products" ? "active" : ""}
          onClick={() => {
            setActiveTab("products");
            setSearch("");
            setError("");
          }}
        >
          <Package size={19} />
          <span>Товары</span>
          <small>{products.length}</small>
        </button>

        <button
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => {
            setActiveTab("categories");
            setSearch("");
            setError("");
          }}
        >
          <Layers size={19} />
          <span>Категории</span>
          <small>{categories.length}</small>
        </button>

        <button
          className={activeTab === "slides" ? "active" : ""}
          onClick={() => {
            setActiveTab("slides");
            setSearch("");
            setError("");
          }}
        >
          <Images size={19} />
          <span>Слайды</span>
          <small>{slides.length}</small>
        </button>

        <div className="shop-admin-sidebar-bottom">
          <a href="/">
            <ArrowLeft size={18} />
            Вернуться в магазин
          </a>
        </div>
      </aside>

      <main className="shop-admin-main">
        <header className="shop-admin-header">
          <div>
            <div className="shop-admin-breadcrumb">
              RUNO / Администрирование
            </div>

            <h1>
              {activeTab === "products" && "Товары"}
              {activeTab === "categories" && "Категории"}
              {activeTab === "slides" && "Слайды"}
            </h1>

            <p>
              Управляйте содержимым интернет-магазина RUNO
            </p>
          </div>

          <button
            className="shop-admin-refresh"
            onClick={loadData}
            disabled={loading}
            title="Обновить данные"
          >
            <RefreshCw size={17} />
          </button>
        </header>

        <section className="shop-admin-stats">
          <div className="shop-admin-stat">
            <div className="shop-admin-stat-icon blue">
              <Package size={21} />
            </div>
            <div>
              <span>Всего товаров</span>
              <strong>{products.length}</strong>
            </div>
          </div>

          <div className="shop-admin-stat">
            <div className="shop-admin-stat-icon purple">
              <Layers size={21} />
            </div>
            <div>
              <span>Категории</span>
              <strong>{categories.length}</strong>
            </div>
          </div>

          <div className="shop-admin-stat">
            <div className="shop-admin-stat-icon orange">
              <Images size={21} />
            </div>
            <div>
              <span>Слайды</span>
              <strong>{slides.length}</strong>
            </div>
          </div>
        </section>

        <section className="shop-admin-content">
          <div className="shop-admin-toolbar">
            <div className="shop-admin-search">
              <Search size={18} />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "products"
                    ? "Поиск товаров..."
                    : activeTab === "categories"
                    ? "Поиск категорий..."
                    : "Поиск слайдов..."
                }
              />
            </div>

            <button
              className="shop-admin-add"
              onClick={() => {
                if (activeTab === "products") openProductModal();
                if (activeTab === "categories") openCategoryModal();
                if (activeTab === "slides") openSlideModal();
              }}
            >
              <Plus size={18} />
              Добавить
            </button>
          </div>

          {error && !modal && (
            <div className="shop-admin-error">{error}</div>
          )}

          {loading ? (
            <div className="shop-admin-loading">
              <Loader2 className="spin" size={30} />
              <span>Загружаем данные...</span>
            </div>
          ) : (
            <>
              {activeTab === "products" && (
                <div className="shop-admin-table-wrap">
                  <table className="shop-admin-table">
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Категория</th>
                        <th>Цена</th>
                        <th>Рейтинг</th>
                        <th>Действия</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="shop-admin-product">
                              <img
                                src={
                                  product.image ||
                                  product.images?.[0]
                                }
                                alt={product.title}
                              />

                              <div>
                                <strong>{product.title}</strong>
                                <span>{product.titleKg || "Кыргызча жок"}</span>
                                <span>{product.id}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {categories.find(
                              (category) =>
                                category.id === product.category
                            )?.name || product.category || "—"}
                          </td>

                          <td>
                            <strong>
                              {formatPrice(product.price)}
                            </strong>

                            {product.oldPrice > product.price && (
                              <span className="shop-admin-old-price">
                                {formatPrice(product.oldPrice)}
                              </span>
                            )}
                          </td>

                          <td>★ {product.rating ?? 0}</td>

                          <td>
                            <div className="shop-admin-actions">
                              <button
                                title="Редактировать"
                                onClick={() =>
                                  openProductModal(product)
                                }
                              >
                                <Pencil size={17} />
                              </button>

                              <button
                                className="delete"
                                title="Удалить"
                                onClick={() =>
                                  deleteItem("products", product)
                                }
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredProducts.length === 0 && (
                    <div className="shop-admin-empty">
                      Товары не найдены
                    </div>
                  )}
                </div>
              )}

              {activeTab === "categories" && (
                <div className="shop-admin-category-grid">
                  {filteredCategories.map((category) => {
                    const count = products.filter(
                      (product) =>
                        product.category === category.id
                    ).length;

                    return (
                      <div
                        className="shop-admin-category-card"
                        key={category.id}
                      >
                        <div className="shop-admin-category-icon">
                          <Layers size={23} />
                        </div>

                        <div className="shop-admin-category-info">
                          <strong>{category.name}</strong>
                          <span>{category.nameKg || "Кыргызча жок"}</span>
                          <span>{count} товаров</span>
                          <small>ID: {category.id}</small>
                        </div>

                        <div className="shop-admin-actions">
                          <button
                            title="Редактировать"
                            onClick={() =>
                              openCategoryModal(category)
                            }
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            className="delete"
                            title="Удалить"
                            disabled={category.id === "all"}
                            onClick={() =>
                              deleteItem("categories", category)
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className="shop-admin-empty">
                      Категории не найдены
                    </div>
                  )}
                </div>
              )}

              {activeTab === "slides" && (
                <div className="shop-admin-slide-grid">
                  {filteredSlides.map((slide) => (
                    <div
                      className="shop-admin-slide-card"
                      key={slide.id}
                    >
                      <div className="shop-admin-slide-image">
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={slide.imageAlt || slide.title}
                          />
                        ) : (
                          <ImagePlus size={35} />
                        )}
                      </div>

                      <div className="shop-admin-slide-info">
                        <strong>{slide.title}</strong>
                        <span>{slide.titleKg || "Кыргызча жок"}</span>

                        <p>
                          {slide.description || "Без описания"}
                        </p>

                        <p>
                          {slide.descriptionKg || "Кыргызча описание жок"}
                        </p>

                        <span>{slide.link || "/"}</span>

                        <div className="shop-admin-actions">
                          <button
                            title="Редактировать"
                            onClick={() =>
                              openSlideModal(slide)
                            }
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            className="delete"
                            title="Удалить"
                            onClick={() =>
                              deleteItem("slides", slide)
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredSlides.length === 0 && (
                    <div className="shop-admin-empty">
                      Слайды не найдены
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {modal && (
        <div
          className="shop-admin-modal-overlay"
          onMouseDown={closeModal}
        >
          <div
            className="shop-admin-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="shop-admin-modal-header">
              <div>
                <h2>
                  {modal === "product" &&
                    (editingId
                      ? "Редактировать товар"
                      : "Новый товар")}

                  {modal === "category" &&
                    (editingId
                      ? "Редактировать категорию"
                      : "Новая категория")}

                  {modal === "slide" &&
                    (editingId
                      ? "Редактировать слайд"
                      : "Новый слайд")}
                </h2>

                <p>Заполните необходимые поля</p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
              >
                <X size={21} />
              </button>
            </div>

            {error && (
              <div className="shop-admin-error">{error}</div>
            )}

            {modal === "product" && (
              <form
                onSubmit={saveProduct}
                className="shop-admin-form"
              >
                <h3>Русский язык</h3>

                <label>
                  Название товара *
                  <input
                    required
                    value={productForm.title}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="Например: Худи базовое оверсайз"
                  />
                </label>

                <label>
                  Описание
                  <textarea
                    rows={4}
                    value={productForm.description || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Описание товара на русском..."
                  />
                </label>

                <h3>Кыргыз тили</h3>

                <label>
                  Название товара КГ *
                  <input
                    required
                    value={productForm.titleKg || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        titleKg: e.target.value,
                      })
                    }
                    placeholder="Мисалы: Негизги худи"
                  />
                </label>

                <label>
                  Описание КГ
                  <textarea
                    rows={4}
                    value={productForm.descriptionKg || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        descriptionKg: e.target.value,
                      })
                    }
                    placeholder="Товардын кыргызча сүрөттөмөсү..."
                  />
                </label>

                <h3>Основная информация</h3>

<label>
  Наполнитель (необязательно)
  <select
    value={productForm.filling || ""}
    onChange={(e) =>
      setProductForm({
        ...productForm,
        filling: e.target.value,
      })
    }
  >
    <option value="">Не выбрано</option>
    <option value="Вата">Вата</option>
    <option value="Шерсть">Шерсть</option>
  </select>
</label>

<label>
  Сезон (необязательно)
  <select
    value={productForm.season || ""}
    onChange={(e) =>
      setProductForm({
        ...productForm,
        season: e.target.value,
      })
    }
  >
    <option value="">Не выбрано</option>
    <option value="Лето">Лето</option>
    <option value="Всесезонка">Всесезонка</option>
    <option value="Зима">Зима</option>
  </select>
</label>

                <label>
                  Тип размера (необязательно)
                  <select
                    value={productForm.bedType || ""}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        bedType: e.target.value,
                      })
                    }
                  >
                    <option value="">Не выбрано</option>
                    <option value="Односпалка">Односпалка</option>
                    <option value="Двухспалка">Двухспалка</option>
                    <option value="Семейка">Семейка</option>
                  </select>
                </label>

                <div className="shop-admin-form-row">
                  <label>
                    Категория *
                    <select
                      required
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Выберите категорию
                      </option>

                      {categories
                        .filter((category) => category.id !== "all")
                        .map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                            {category.nameKg
                              ? ` / ${category.nameKg}`
                              : ""}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label>
                    Цена (сом) *
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="shop-admin-form-row">
                  <label>
                    Старая цена
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={productForm.oldPrice}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          oldPrice: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Бейдж
                    <input
                      value={productForm.badge || ""}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          badge: e.target.value,
                        })
                      }
                      placeholder="Хит, Новинка, Скидка"
                    />
                  </label>
                </div>

                <div className="shop-admin-form-row">
                  <label>
                    Рейтинг
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={productForm.rating}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          rating: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Количество отзывов
                    <input
                      type="number"
                      min="0"
                      value={productForm.reviews}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          reviews: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Главное изображение (URL)
                  <input
                    value={productForm.image}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        image: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </label>

                {productForm.image && (
                  <div className="shop-admin-preview">
                    <img
                      src={productForm.image}
                      alt="Предпросмотр"
                    />
                  </div>
                )}

                <label>
                  Дополнительные изображения (каждая ссылка с новой строки)
                  <textarea
                    rows={4}
                    value={imagesText}
                    onChange={(e) =>
                      setImagesText(e.target.value)
                    }
                    placeholder={"https://image1.jpg\nhttps://image2.jpg"}
                  />
                </label>

                <div className="shop-admin-modal-footer">
                  <button
                    type="button"
                    className="shop-admin-cancel"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>

                  <button
                    type="submit"
                    className="shop-admin-submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    Сохранить
                  </button>
                </div>
              </form>
            )}

            {modal === "category" && (
              <form
                onSubmit={saveCategory}
                className="shop-admin-form"
              >
                {!editingId && (
                  <label>
                    ID категории (необязательно)
                    <input
                      value={categoryForm.id}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          id: e.target.value,
                        })
                      }
                      placeholder="Например: clothes"
                    />
                  </label>
                )}

                <h3>Русский язык</h3>

                <label>
                  Название категории *
                  <input
                    required
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Например: Одежда"
                  />
                </label>

                <h3>Кыргыз тили</h3>

                <label>
                  Название категории КГ *
                  <input
                    required
                    value={categoryForm.nameKg || ""}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        nameKg: e.target.value,
                      })
                    }
                    placeholder="Мисалы: Кийимдер"
                  />
                </label>

                <div className="shop-admin-modal-footer">
                  <button
                    type="button"
                    className="shop-admin-cancel"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>

                  <button
                    type="submit"
                    className="shop-admin-submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    Сохранить
                  </button>
                </div>
              </form>
            )}

            {modal === "slide" && (
              <form
                onSubmit={saveSlide}
                className="shop-admin-form"
              >
                <h3>Русский язык</h3>

                <label>
                  Заголовок *
                  <input
                    required
                    value={slideForm.title}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="Вещи, которые делают день."
                  />
                </label>

                <label>
                  Описание
                  <textarea
                    rows={2}
                    value={slideForm.description}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Плавающий заголовок
                  <input
                    value={slideForm.floatingTitle}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        floatingTitle: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Плавающий текст
                  <input
                    value={slideForm.floatingText}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        floatingText: e.target.value,
                      })
                    }
                  />
                </label>

                <h3>Кыргыз тили</h3>

                <label>
                  Заголовок КГ *
                  <input
                    required
                    value={slideForm.titleKg || ""}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        titleKg: e.target.value,
                      })
                    }
                    placeholder="Күндү көрктөндүргөн буюмдар."
                  />
                </label>

                <label>
                  Описание КГ
                  <textarea
                    rows={2}
                    value={slideForm.descriptionKg || ""}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        descriptionKg: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Плавающий заголовок КГ
                  <input
                    value={slideForm.floatingTitleKg || ""}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        floatingTitleKg: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Плавающий текст КГ
                  <input
                    value={slideForm.floatingTextKg || ""}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        floatingTextKg: e.target.value,
                      })
                    }
                  />
                </label>

                <h3>Изображение и ссылка</h3>

                <label>
                  Изображение (URL)
                  <input
                    value={slideForm.image}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        image: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </label>

                {slideForm.image && (
                  <div className="shop-admin-preview shop-admin-preview-wide">
                    <img
                      src={slideForm.image}
                      alt="Предпросмотр слайда"
                    />
                  </div>
                )}

                <label>
                  Alt изображения
                  <input
                    value={slideForm.imageAlt}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        imageAlt: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Ссылка при нажатии
                  <input
                    value={slideForm.link}
                    onChange={(e) =>
                      setSlideForm({
                        ...slideForm,
                        link: e.target.value,
                      })
                    }
                    placeholder="/"
                  />
                </label>

                <div className="shop-admin-modal-footer">
                  <button
                    type="button"
                    className="shop-admin-cancel"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Отмена
                  </button>

                  <button
                    type="submit"
                    className="shop-admin-submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    Сохранить
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
