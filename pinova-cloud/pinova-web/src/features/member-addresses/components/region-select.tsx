"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { RegionOption } from "../lib/region-options";
import styles from "../member-addresses.module.css";

interface RegionSelectProps {
  disabled?: boolean;
  error?: string;
  label: string;
  name: "provinceCode" | "cityCode" | "districtCode";
  options: RegionOption[];
  placeholder: string;
  value: string;
  onChange: (code: string) => void;
}

export function RegionSelect({
  disabled,
  error,
  label,
  name,
  options,
  placeholder,
  value,
  onChange,
}: RegionSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const labelId = `${listboxId}-label`;
  const errorId = `${listboxId}-error`;
  const selectedIndex = options.findIndex((option) => option.code === value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`#${CSS.escape(`${listboxId}-option-${activeIndex}`)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen, listboxId]);

  const open = (initialIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    if (disabled || options.length === 0) return;
    setActiveIndex(initialIndex);
    setIsOpen(true);
  };

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.code);
    setActiveIndex(index);
    setIsOpen(false);
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (!isOpen) {
      open(direction === 1 ? 0 : options.length - 1);
      return;
    }
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : options.length - 1;
      return (current + direction + options.length) % options.length;
    });
  };

  return (
    <div
      ref={rootRef}
      className={styles.regionSelect}
      data-open={isOpen || undefined}
    >
      <span id={labelId} className={styles.regionSelectLabel}>
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        name={name}
        className={styles.regionSelectTrigger}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={
          isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        data-placeholder={!selectedOption || undefined}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveActiveOption(event.key === "ArrowDown" ? 1 : -1);
            return;
          }
          if (event.key === "Home" && isOpen) {
            event.preventDefault();
            setActiveIndex(0);
            return;
          }
          if (event.key === "End" && isOpen) {
            event.preventDefault();
            setActiveIndex(options.length - 1);
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && isOpen) {
            event.preventDefault();
            selectOption(activeIndex);
            return;
          }
          if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setIsOpen(false);
          }
          if (event.key === "Tab") setIsOpen(false);
        }}
      >
        <span>{selectedOption?.name ?? placeholder}</span>
        <ChevronDown aria-hidden="true" size={17} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={listboxId}
          className={styles.regionSelectMenu}
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option, index) => (
            <button
              key={option.code}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={option.code === value}
              data-active={index === activeIndex || undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(index)}
            >
              <span>{option.name}</span>
              {option.code === value && <Check aria-hidden="true" size={16} />}
            </button>
          ))}
        </div>
      )}

      {error && (
        <small id={errorId} className={styles.fieldError} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
