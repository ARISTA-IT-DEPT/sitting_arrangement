import { useEffect, useRef, useState } from 'react';

const VIEWPORT_CONFIG = {
  room1: {
    width: 1560,
    height: 1091,
    mobileScale: 0.46,
    minScale: 0.28,
    maxScale: 2.2,
  },
  room2: {
    width: 790,
    height: 1020,
    mobileScale: 0.7,
    minScale: 0.4,
    maxScale: 2.4,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTouchDistance(touchA, touchB) {
  return Math.hypot(touchA.clientX - touchB.clientX, touchA.clientY - touchB.clientY);
}

function getTouchPoint(viewport, touchA, touchB) {
  const rect = viewport.getBoundingClientRect();
  return {
    x: ((touchA.clientX + touchB.clientX) / 2) - rect.left,
    y: ((touchA.clientY + touchB.clientY) / 2) - rect.top,
  };
}

function isInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest('button, input, select, textarea, a, [role="button"]'));
}

function PlanViewport({ roomKey, children }) {
  const viewportRef = useRef(null);
  const scaleRef = useRef(1);
  const touchStateRef = useRef({ mode: null });
  const dragStateRef = useRef({ active: false });
  const [scale, setScale] = useState(1);
  const [hasManualZoom, setHasManualZoom] = useState(false);

  const config = VIEWPORT_CONFIG[roomKey] ?? VIEWPORT_CONFIG.room1;

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  function applyScale(nextScale, anchorPoint) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const clampedScale = clamp(nextScale, config.minScale, config.maxScale);
    const currentScale = scaleRef.current;
    const fallbackAnchor = {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2,
    };
    const anchor = anchorPoint ?? fallbackAnchor;
    const contentX = (viewport.scrollLeft + anchor.x) / currentScale;
    const contentY = (viewport.scrollTop + anchor.y) / currentScale;

    setScale(clampedScale);

    requestAnimationFrame(() => {
      const currentViewport = viewportRef.current;

      if (!currentViewport) {
        return;
      }

      currentViewport.scrollLeft = Math.max(0, contentX * clampedScale - anchor.x);
      currentViewport.scrollTop = Math.max(0, contentY * clampedScale - anchor.y);
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return undefined;
    }

    function updateDefaultScale() {
      const fitScale = Math.min(viewport.clientWidth / config.width, 1);
      const isCompactViewport = viewport.clientWidth <= 768;
      const nextScale = isCompactViewport ? Math.max(fitScale, config.mobileScale) : fitScale;

      if (!hasManualZoom || !isCompactViewport) {
        const clampedScale = clamp(nextScale, config.minScale, config.maxScale);
        setScale(clampedScale);
        scaleRef.current = clampedScale;

        requestAnimationFrame(() => {
          const currentViewport = viewportRef.current;

          if (!currentViewport) {
            return;
          }

          currentViewport.scrollLeft = 0;
          currentViewport.scrollTop = 0;
        });
      }
    }

    updateDefaultScale();

    const resizeObserver = new ResizeObserver(() => {
      updateDefaultScale();
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [config.height, config.maxScale, config.minScale, config.mobileScale, config.width, hasManualZoom]);

  function handleWheel(event) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    setHasManualZoom(true);

    const rect = viewport.getBoundingClientRect();
    const anchorPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const zoomDelta = clamp(-event.deltaY * 0.0014, -0.22, 0.22);

    applyScale(scaleRef.current + zoomDelta, anchorPoint);
  }

  function handleTouchStart(event) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (event.touches.length === 2) {
      touchStateRef.current = {
        mode: 'pinch',
        distance: getTouchDistance(event.touches[0], event.touches[1]),
        scale: scaleRef.current,
      };
      return;
    }

    if (event.touches.length === 1) {
      if (isInteractiveTarget(event.target)) {
        touchStateRef.current = { mode: null };
        return;
      }

      touchStateRef.current = {
        mode: 'pan',
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
    }
  }

  function handleTouchMove(event) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const currentTouchState = touchStateRef.current;

    if (event.touches.length === 2 && currentTouchState.mode === 'pinch') {
      event.preventDefault();
      setHasManualZoom(true);

      const nextDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const nextScale = currentTouchState.scale * (nextDistance / currentTouchState.distance);
      applyScale(nextScale, getTouchPoint(viewport, event.touches[0], event.touches[1]));
      return;
    }

    if (event.touches.length === 1 && currentTouchState.mode === 'pan') {
      event.preventDefault();
      viewport.scrollLeft = currentTouchState.scrollLeft - (event.touches[0].clientX - currentTouchState.x);
      viewport.scrollTop = currentTouchState.scrollTop - (event.touches[0].clientY - currentTouchState.y);
    }
  }

  function handleTouchEnd(event) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    if (event.touches.length === 1) {
      touchStateRef.current = {
        mode: 'pan',
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
      return;
    }

    touchStateRef.current = { mode: null };
  }

  function handlePointerDown(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    if (isInteractiveTarget(event.target)) {
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    dragStateRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };

    viewport.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const viewport = viewportRef.current;

    if (!viewport || !dragStateRef.current.active) {
      return;
    }

    viewport.scrollLeft = dragStateRef.current.scrollLeft - (event.clientX - dragStateRef.current.x);
    viewport.scrollTop = dragStateRef.current.scrollTop - (event.clientY - dragStateRef.current.y);
  }

  function handlePointerUp(event) {
    const viewport = viewportRef.current;

    dragStateRef.current = { active: false };

    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section className="map-viewport">
      <div
        ref={viewportRef}
        className={`map-viewport__frame map-viewport__frame--${roomKey}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="map-viewport__stage"
          style={{
            width: `${config.width * scale}px`,
            height: `${config.height * scale}px`,
          }}
        >
          <div
            className={`map-viewport__content map-viewport__content--${roomKey}`}
            style={{
              width: `${config.width}px`,
              height: `${config.height}px`,
              transform: `scale(${scale})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlanViewport;
