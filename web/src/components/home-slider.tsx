'use client';

import { useEffect, useState } from 'react';
import type { HomeSlide } from '@/lib/cms';

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href || '');
}

export function HomeSlider({ slides }: { slides: HomeSlide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="home-slider">
      <div className="home-slider-stage">
        {slides.map((slide, index) => (
          <a
            className={`home-slide ${index === active ? 'is-active' : ''}`}
            href={slide.href}
            key={slide.source_key}
            rel={isExternalHref(slide.href) ? 'noreferrer' : undefined}
            target={isExternalHref(slide.href) ? '_blank' : undefined}
          >
            <span
              className="home-slide-bg"
              style={{ background: slide.background_css || undefined }}
            />
            {slide.image_url ? (
              <img alt={slide.title} className="home-slide-image" src={slide.image_url} />
            ) : null}
            <div className="home-slide-copy">
              <div className="home-slide-kicker">Featured</div>
              <h2 className="home-slide-title">{slide.title}</h2>
              {slide.subtitle ? <p className="home-slide-subtitle">{slide.subtitle}</p> : null}
            </div>
          </a>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="home-slider-controls">
          <button
            aria-label="Previous slide"
            className="home-slider-arrow"
            onClick={() => setActive((active - 1 + slides.length) % slides.length)}
            type="button"
          >
            {'<'}
          </button>
          <div className="home-slider-dots">
            {slides.map((slide, index) => (
              <button
                aria-label={`Go to ${slide.title}`}
                className={`home-slider-dot ${index === active ? 'is-active' : ''}`}
                key={slide.source_key}
                onClick={() => setActive(index)}
                type="button"
              >
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
          <button
            aria-label="Next slide"
            className="home-slider-arrow"
            onClick={() => setActive((active + 1) % slides.length)}
            type="button"
          >
            {'>'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
