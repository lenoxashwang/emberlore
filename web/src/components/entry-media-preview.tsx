'use client';

import { useEffect, useState } from 'react';

type EntryMediaPreviewProps = {
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  emptyLabel: string;
  openLabel: string;
  closeLabel: string;
};

export function EntryMediaPreview({
  title,
  imageUrl,
  videoUrl,
  emptyLabel,
  openLabel,
  closeLabel,
}: EntryMediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasPreview = Boolean(videoUrl);
  const previewLabel = `${title} ${openLabel}`;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {imageUrl ? (
        <div className="entry-media-card">
          <img alt={title} className="hero-image" src={imageUrl} />
          {hasPreview ? (
            <button
              aria-label={openLabel}
              className="entry-media-trigger"
              onClick={() => setIsOpen(true)}
              title={openLabel}
              type="button"
            >
              <span className="entry-media-trigger-icon" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="empty-state">{emptyLabel}</div>
      )}

      {isOpen && hasPreview ? (
        <div
          className="entry-media-modal"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="entry-media-modal-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={previewLabel}
          >
            <img alt={previewLabel} className="entry-media-preview" src={videoUrl} />
            <button
              aria-label={closeLabel}
              className="entry-media-close"
              onClick={() => setIsOpen(false)}
              title={closeLabel}
              type="button"
            >
              <span aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
