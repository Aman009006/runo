
import { useEffect } from "react";

export default function SEO({
  title,
  description,
  image,
  url,
}) {
  useEffect(() => {
    document.title = title;

    const setMeta = (selector, attribute, value) => {
      let element = document.head.querySelector(selector);

      if (!element) {
        element = document.createElement("meta");
        document.head.appendChild(element);
      }

      element.setAttribute(attribute, value);
    };

    setMeta(
      'meta[name="description"]',
      "name",
      "description"
    );

    document.head.querySelector(
      'meta[name="description"]'
    ).setAttribute("content", description);

    setMeta(
      'meta[property="og:title"]',
      "property",
      "og:title"
    );

    document.head.querySelector(
      'meta[property="og:title"]'
    ).setAttribute("content", title);

    setMeta(
      'meta[property="og:description"]',
      "property",
      "og:description"
    );

    document.head.querySelector(
      'meta[property="og:description"]'
    ).setAttribute("content", description);

    setMeta(
      'meta[property="og:image"]',
      "property",
      "og:image"
    );

    document.head.querySelector(
      'meta[property="og:image"]'
    ).setAttribute("content", image);

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    );

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = url;

  }, [title, description, image, url]);

  return null;
}
