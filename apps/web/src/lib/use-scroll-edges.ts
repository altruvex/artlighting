"use client";

import { useCallback, useRef } from "react";

/**
 * Marks a scroll container with `data-more-start` / `data-more-end` while
 * there is content past its top / bottom edge — what the `.scroll-fade`
 * utility fades on. Written straight to the element, not through state:
 * it changes on every scroll frame and nothing else needs to re-render.
 *
 * Returns a callback ref. Watches scrolling, the box resizing and the
 * content changing size (a facet list growing after a filter change).
 */
export function useScrollEdges<T extends HTMLElement>() {
  const cleanup = useRef<() => void>(undefined);

  return useCallback((element: T | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!element) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { scrollTop, scrollHeight, clientHeight } = element;
      element.toggleAttribute("data-more-start", scrollTop > 1);
      element.toggleAttribute("data-more-end", scrollTop + clientHeight < scrollHeight - 1);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    element.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    for (const child of element.children) resize.observe(child);

    cleanup.current = () => {
      element.removeEventListener("scroll", schedule);
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
