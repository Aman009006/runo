
import React, { useState } from "react";
import { Star, Check } from "lucide-react";
import { formatPrice } from "./getProductsFromJSON";

export default function ProductCard({
  product,
  onOpen,
  onAddToCart,
  language,
}) {
  const isKg = language === "KG";
  const [added, setAdded] = useState(false);
  const [animating, setAnimating] = useState(false);

  const title = isKg
    ? product.titleKg || product.title
    : product.title;

  const badge = isKg
    ? product.badge === "Хит"
      ? "Хит"
      : product.badge === "Новинка"
      ? "Жаңы"
      : product.badge
    : product.badge;

  const handleAddToCart = () => {
  if (added) return;

  onAddToCart(product);

  setAdded(true);
  setAnimating(true);

  setTimeout(() => {
    setAnimating(false);
  }, 1500);
};

  return (
    <article className="shop-product-card">
      <button
        className="shop-product-image-button"
        onClick={() => onOpen(product.id)}
        aria-label={`${isKg ? "Ачуу" : "Открыть"} ${title}`}
      >
        <img
          className="shop-product-image"
          src={product.image}
          alt={title}
          loading="lazy"
        />

        {badge && (
          <span
            className={`shop-product-badge ${
              product.badge === "Хит" ||
              product.badge === "Новинка"
                ? "is-hit"
                : ""
            }`}
          >
            {badge}
          </span>
        )}
      </button>

      <button
        className="shop-product-title "
        onClick={() => onOpen(product.id)}
      >
        {title}
      </button>

      <div className="shop-product-rating">
        <Star size={14} fill="currentColor" />
        {" "}{product.rating}
        <span>({product.reviews})</span>
      </div>

      <div className="shop-product-price-row">
        <strong>{formatPrice(product.price)}</strong>

        {product.oldPrice > product.price && (
          <del>{formatPrice(product.oldPrice)}</del>
        )}
      </div>

      <button
        className={`shop-add-button ${
          animating ? "is-adding" : ""
        } ${added ? "is-added" : ""}`}
        onClick={handleAddToCart}
        disabled={animating}
      >
        <span className="shop-add-button-progress" />

        <span className="shop-add-button-content">
          {added ? (
            <>
              {isKg ? "Себетте" : "В корзине"}
            </>
          ) : (
            isKg ? "Себетке кошуу" : "В корзину"
          )}
        </span>
      </button>
    </article>
  );
}
