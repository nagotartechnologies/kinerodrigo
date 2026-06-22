import { useState, useEffect, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface LongPressTarget {
  dia: Date;
  hora: string;
  bloqueado: any;
}

interface UseTouchDragOptions {
  onDrop: (cita: any, nuevaFecha: Date, nuevaHora: string) => Promise<void>;
  onCrearCita: (dia: Date, hora: string) => void;
  onBloquearHorario: (dia: Date, hora: string) => void;
  onEliminarBloqueo: (id: number) => void;
  obtenerDiasSemana: () => Date[];
}

export default function useTouchDrag({
  onDrop,
  onCrearCita,
  onBloquearHorario,
  onEliminarBloqueo,
  obtenerDiasSemana,
}: UseTouchDragOptions) {
  const [citaArrastrada, setCitaArrastrada] = useState<any>(null);
  const [touchStartPos, setTouchStartPos] = useState<Position | null>(null);
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);
  const [isReallyDragging, setIsReallyDragging] = useState(false);
  const [touchPosition, setTouchPosition] = useState<Position | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Long press states
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressTarget, setLongPressTarget] = useState<LongPressTarget | null>(null);

  const cleanupScroll = useCallback(() => {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const resetTouchState = useCallback(() => {
    setIsDraggingTouch(false);
    setIsReallyDragging(false);
    setTouchStartPos(null);
    setTouchPosition(null);
    setCitaArrastrada(null);
    document.body.classList.remove('dragging');
    cleanupScroll();
  }, [cleanupScroll]);

  // Efecto para manejar scroll durante drag
  useEffect(() => {
    if (!isReallyDragging) {
      cleanupScroll();
    }
    return cleanupScroll;
  }, [isReallyDragging, cleanupScroll]);

  // --- Desktop drag & drop ---
  const handleDragStart = useCallback((e: React.DragEvent, cita: any) => {
    setCitaArrastrada(cita);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // --- Long press (slots vacios) ---
  const handleSlotTouchStart = useCallback((e: React.TouchEvent, dia: Date, hora: string, bloqueado: any, citasEnHora: any[]) => {
    if (citasEnHora.length > 0) return;

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setLongPressTarget({ dia, hora, bloqueado });

    const timer = setTimeout(() => {
      setIsLongPressing(true);
      if (navigator.vibrate) navigator.vibrate(50);

      if (bloqueado) {
        onEliminarBloqueo(bloqueado.id);
      } else {
        onBloquearHorario(dia, hora);
      }

      setLongPressTimer(null);
      setIsLongPressing(false);
      setLongPressTarget(null);
      setTouchStartPos(null);
    }, 500);

    setLongPressTimer(timer);
  }, [onBloquearHorario, onEliminarBloqueo]);

  const handleSlotTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos || !longPressTimer) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);

    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      setIsLongPressing(false);
      setLongPressTarget(null);
    }
  }, [touchStartPos, longPressTimer]);

  const handleSlotTouchEnd = useCallback((e: React.TouchEvent, dia: Date, hora: string, bloqueado: any, citasEnHora: any[]) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!isLongPressing && touchStartPos && citasEnHora.length === 0 && !bloqueado) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      if (deltaX < 10 && deltaY < 10) {
        onCrearCita(dia, hora);
      }
    }

    setIsLongPressing(false);
    setLongPressTarget(null);
    setTouchStartPos(null);
  }, [longPressTimer, isLongPressing, touchStartPos, onCrearCita]);

  const handleSlotTouchCancel = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
    setLongPressTarget(null);
    setTouchStartPos(null);
  }, [longPressTimer]);

  // --- Touch drag (citas) ---
  const handleTouchStart = useCallback((e: React.TouchEvent, cita: any) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    setCitaArrastrada(cita);
    setIsDraggingTouch(true);
    setIsReallyDragging(false);
    document.body.classList.add('dragging');
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingTouch || !touchStartPos) return;

    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });

    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);

    if ((deltaX > 10 || deltaY > 10) && !isReallyDragging) {
      setIsReallyDragging(true);
    }

    // Auto-scroll near edges
    const scrollThreshold = 100;
    const scrollSpeed = 10;
    const viewportHeight = window.innerHeight;
    const touchY = touch.clientY;

    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (touchY < scrollThreshold) {
      autoScrollIntervalRef.current = setInterval(() => window.scrollBy(0, -scrollSpeed), 16);
    } else if (touchY > viewportHeight - scrollThreshold) {
      autoScrollIntervalRef.current = setInterval(() => window.scrollBy(0, scrollSpeed), 16);
    }
  }, [isDraggingTouch, touchStartPos, isReallyDragging]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (!citaArrastrada || !isDraggingTouch) {
      resetTouchState();
      return;
    }

    const touch = e.changedTouches[0];

    if (touchStartPos) {
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      if (deltaX < 10 && deltaY < 10) {
        resetTouchState();
        return;
      }
    }

    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element) {
      const horaSlot = element.closest('.hora-slot');
      if (horaSlot) {
        const diaIndex = parseInt(horaSlot.getAttribute('data-dia-index') || '0');
        const horaBase = horaSlot.getAttribute('data-hora') || '';

        if (horaBase) {
          const rect = horaSlot.getBoundingClientRect();
          const relativeY = touch.clientY - rect.top;
          const slotHeight = rect.height;
          const quarter = Math.floor((relativeY / slotHeight) * 4);
          const minutos = Math.min(quarter * 15, 45);
          const [horaNum] = horaBase.split(':');
          const horaCompleta = `${horaNum}:${minutos.toString().padStart(2, '0')}`;

          const dias = obtenerDiasSemana();
          const nuevaFecha = dias[diaIndex];

          if (nuevaFecha && citaArrastrada) {
            await onDrop(citaArrastrada, nuevaFecha, horaCompleta);
          }
        }
      }
    }

    resetTouchState();
  }, [citaArrastrada, isDraggingTouch, touchStartPos, obtenerDiasSemana, onDrop, resetTouchState]);

  const handleTouchCancel = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
    resetTouchState();
  }, [resetTouchState]);

  return {
    citaArrastrada,
    setCitaArrastrada,
    isReallyDragging,
    isDraggingTouch,
    touchPosition,
    isLongPressing,
    longPressTarget,
    longPressTimer,
    // Desktop drag
    handleDragStart,
    handleDragOver,
    // Touch drag (citas)
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    // Long press (slots)
    handleSlotTouchStart,
    handleSlotTouchMove,
    handleSlotTouchEnd,
    handleSlotTouchCancel,
  };
}
