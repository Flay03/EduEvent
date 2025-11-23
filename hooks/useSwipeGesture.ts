import { useState, TouchEvent } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeConfig {
  minSwipeDistance?: number;
}

export const useSwipeGesture = (handlers: SwipeHandlers, config: SwipeConfig = {}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Required distance between touchStart and touchEnd to be detected as a swipe
  const minSwipeDistance = config.minSwipeDistance || 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontal) {
      if (Math.abs(distanceX) < minSwipeDistance) return;
      if (distanceX > 0) {
        handlers.onSwipeLeft && handlers.onSwipeLeft();
      } else {
        handlers.onSwipeRight && handlers.onSwipeRight();
      }
    } else {
      if (Math.abs(distanceY) < minSwipeDistance) return;
      if (distanceY > 0) {
        handlers.onSwipeUp && handlers.onSwipeUp();
      } else {
        handlers.onSwipeDown && handlers.onSwipeDown();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};