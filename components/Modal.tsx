"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

let modalStackDepth = 0;
let previousBodyOverflow = "";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  ariaLabelledBy?: string;
  closeOnOutsideClick?: boolean;
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  contentClassName = "",
  ariaLabelledBy,
  closeOnOutsideClick = true,
  showCloseButton = false,
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const openModal = () => {
      if (modalStackDepth === 0) previousBodyOverflow = document.body.style.overflow;
      modalStackDepth += 1;
      document.body.style.overflow = "hidden";
    };

    const closeModal = () => {
      if (modalStackDepth > 0) modalStackDepth -= 1;
      if (modalStackDepth === 0) document.body.style.overflow = previousBodyOverflow;
    };

    openModal();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      closeModal();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleBackdropMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (closeOnOutsideClick && event.target === event.currentTarget) onClose();
  }

  const modal = (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${className}`} onMouseDown={handleBackdropMouseDown}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy} className={`relative flex max-h-[calc(100vh-48px)] w-full flex-col overflow-hidden rounded-lg bg-white ${contentClassName}`}>
        {showCloseButton && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
