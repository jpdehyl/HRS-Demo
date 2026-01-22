import { useState, useCallback } from "react";

/**
 * A reusable hook for managing multiple modal states in a component.
 * Reduces boilerplate from multiple useState calls and provides a clean API.
 *
 * @example
 * ```tsx
 * const { modals, openModal, closeModal, closeAllModals } = useModalState({
 *   leadDetail: null as Lead | null,
 *   sdrDetail: null as SDR | null,
 *   drillDown: null as DrillDownConfig | null,
 * });
 *
 * // Open a modal with data
 * openModal('leadDetail', selectedLead);
 *
 * // Close a specific modal
 * closeModal('leadDetail');
 *
 * // Check if modal is open
 * const isOpen = !!modals.leadDetail;
 * ```
 */
export function useModalState<T extends Record<string, unknown>>(initialState: T) {
  const [modals, setModals] = useState<T>(initialState);

  const openModal = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setModals((prev) => ({ ...prev, [key]: value }));
  }, []);

  const closeModal = useCallback(<K extends keyof T>(key: K) => {
    setModals((prev) => ({ ...prev, [key]: null }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals((prev) => {
      const reset = { ...prev };
      for (const key in reset) {
        reset[key] = null as T[typeof key];
      }
      return reset;
    });
  }, []);

  const toggleModal = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setModals((prev) => ({
      ...prev,
      [key]: prev[key] ? null : value,
    }));
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    toggleModal,
    setModals,
  };
}

/**
 * A simpler hook for managing a single modal with data
 *
 * @example
 * ```tsx
 * const { isOpen, data, open, close, toggle } = useSingleModal<Lead>();
 *
 * // Open with data
 * open(selectedLead);
 *
 * // Close
 * close();
 * ```
 */
export function useSingleModal<T>(initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);

  const open = useCallback((value: T) => {
    setData(value);
  }, []);

  const close = useCallback(() => {
    setData(null);
  }, []);

  const toggle = useCallback((value: T) => {
    setData((prev) => (prev ? null : value));
  }, []);

  return {
    isOpen: data !== null,
    data,
    open,
    close,
    toggle,
    setData,
  };
}

/**
 * Hook for managing Dialog open state with onOpenChange compatibility
 *
 * @example
 * ```tsx
 * const leadModal = useDialogModal<Lead>();
 *
 * <Dialog open={leadModal.isOpen} onOpenChange={leadModal.onOpenChange}>
 *   <DialogContent>
 *     {leadModal.data && <LeadDetails lead={leadModal.data} />}
 *   </DialogContent>
 * </Dialog>
 *
 * // To open
 * leadModal.open(selectedLead);
 * ```
 */
export function useDialogModal<T>(initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);

  const open = useCallback((value: T) => {
    setData(value);
  }, []);

  const close = useCallback(() => {
    setData(null);
  }, []);

  // Compatible with Radix Dialog's onOpenChange
  const onOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setData(null);
    }
  }, []);

  return {
    isOpen: data !== null,
    data,
    open,
    close,
    onOpenChange,
    setData,
  };
}

export default useModalState;
