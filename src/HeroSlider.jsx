import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import "./HeroSlider.css";

export default function HeroSlider({ slides = [], language }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const activeSlide = slides[activeIndex];

  // Предварительная загрузка фотографий
  useEffect(() => {
    slides.forEach((slide) => {
      if (slide.image) {
        const img = new Image();
        img.src = slide.image;
      }
    });
  }, [slides]);

  // Сбрасываем индекс, если количество слайдов изменилось
  useEffect(() => {
    setActiveIndex((prev) =>
      slides.length ? Math.min(prev, slides.length - 1) : 0
    );
  }, [slides.length]);

  // Автоматическое переключение каждые 6 секунд
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (!activeSlide) return null;

  const isKg = language === "KG";

  const label = isKg
    ? activeSlide.labelKg || activeSlide.label
    : activeSlide.label;

  const title = isKg
    ? activeSlide.titleKg || activeSlide.title
    : activeSlide.title;

  const description = isKg
    ? activeSlide.descriptionKg || activeSlide.description
    : activeSlide.description;

  const floatingTitle = isKg
    ? activeSlide.floatingTitleKg || activeSlide.floatingTitle
    : activeSlide.floatingTitle;

  const floatingText = isKg
    ? activeSlide.floatingTextKg || activeSlide.floatingText
    : activeSlide.floatingText;

  const openSlide = () => {
    if (activeSlide.link) {
      window.location.href = activeSlide.link;
    }
  };

  return (
    <section className="hero-slider">
      <div
        className="hero-slider-content"
        onClick={openSlide}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSlide();
          }
        }}
      >
        {/* Фоновые фотографии */}
        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            className={`hero-slider-background ${
              activeIndex === index ? "active" : ""
            }`}
            style={{
              backgroundImage: `url("${slide.image}")`,
            }}
          />
        ))}

        {/* Затемнение фотографии */}
        <div className="hero-slider-overlay" />

        {/* Текст баннера */}
        <div className="hero-slider-copy">
          {label && (
            <span className="hero-slider-pill">
              {label}
            </span>
          )}

          <h1>{title}</h1>

          <p>{description}</p>

          <span className="hero-slider-button">
            {isKg ? "Каталогду көрүү" : "Смотреть каталог"}
            <ArrowRight size={18} />
          </span>
        </div>

        {/* Декоративная надпись */}
        <div className="hero-slider-floating">
          <span>RUNO</span>
          <strong>{floatingTitle}</strong>
          <small>{floatingText}</small>
        </div>

        {/* Номер слайда */}
        <div className="hero-slider-number">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </div>
      </div>

      {/* Точки переключения */}
      {slides.length > 1 && (
        <div className="hero-slider-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id || index}
              className={`hero-slider-dot ${
                activeIndex === index ? "active" : ""
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}