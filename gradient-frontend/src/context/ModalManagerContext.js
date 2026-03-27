import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const MAX_ACTIVE_MODALS = 2;
const ModalManagerContext = createContext(null);

export const ModalManagerProvider = ({ children }) => {
  const [activeModals, setActiveModals] = useState([]);

  const openModal = useCallback((newModal) => {
    if (!newModal?.id) return;
    setActiveModals((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== newModal.id);
      const next = [...withoutDuplicate, newModal];
      if (next.length <= MAX_ACTIVE_MODALS) return next;
      return next.slice(next.length - MAX_ACTIVE_MODALS);
    });
  }, []);

  const closeModal = useCallback((id) => {
    setActiveModals((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setActiveModals([]);
  }, []);

  const value = useMemo(
    () => ({
      activeModals,
      openModal,
      closeModal,
      closeAllModals,
      maxActiveModals: MAX_ACTIVE_MODALS,
    }),
    [activeModals, openModal, closeModal, closeAllModals]
  );

  return <ModalManagerContext.Provider value={value}>{children}</ModalManagerContext.Provider>;
};

export const useModalManager = () => {
  const context = useContext(ModalManagerContext);
  if (!context) {
    throw new Error('useModalManager must be used within ModalManagerProvider');
  }
  return context;
};
