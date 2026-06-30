import React from "react";
import { readStorageWithMigration } from "@/lib/storage/migrateKey";

export const PollingConfigContext = React.createContext<{
  mainPollingInterval: number;
  slideoverPollingInterval: number;
  listPollingInterval: number;
  updatePollingConfig: (config: {
    mainPollingInterval?: number;
    slideoverPollingInterval?: number;
    listPollingInterval?: number;
  }) => void;
  getPollingInterval: () => number;
  getSlideoverInterval: () => number;
  getListPollingInterval: () => number;
}>({
  mainPollingInterval: 3000,
  slideoverPollingInterval: 5000,
  listPollingInterval: 10000,
  updatePollingConfig: () => {},
  getPollingInterval: () => 3000,
  getSlideoverInterval: () => 5000,
  getListPollingInterval: () => 10000,
});

export const usePollingConfig = () => React.useContext(PollingConfigContext);

const LEGACY_STORAGE_KEY = "ecn-viewer-polling-config";
export const POLLING_CONFIG_STORAGE_KEY = "edgeops-console-polling-config";

const getDefaultConfig = () => {
  // Check for backward compatibility with controller-config.js
  const controllerRefresh = (window as any).controllerConfig?.refresh || null;
  return {
    mainPollingInterval: controllerRefresh ? +controllerRefresh : 3000,
    slideoverPollingInterval: 2000,
    listPollingInterval: 10000,
  };
};

const loadConfigFromStorage = () => {
  try {
    const stored = readStorageWithMigration(
      localStorage,
      POLLING_CONFIG_STORAGE_KEY,
      LEGACY_STORAGE_KEY,
    );
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        mainPollingInterval:
          parsed.mainPollingInterval || getDefaultConfig().mainPollingInterval,
        slideoverPollingInterval:
          parsed.slideoverPollingInterval ||
          getDefaultConfig().slideoverPollingInterval,
        listPollingInterval:
          parsed.listPollingInterval || getDefaultConfig().listPollingInterval,
      };
    }
  } catch (e) {
    console.error("Error loading polling config from localStorage:", e);
  }
  return getDefaultConfig();
};

export const PollingConfigProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [config, setConfig] = React.useState(loadConfigFromStorage);

  // Listen for storage changes (for cross-tab synchronization)
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === POLLING_CONFIG_STORAGE_KEY && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          setConfig({
            mainPollingInterval:
              newConfig.mainPollingInterval ||
              getDefaultConfig().mainPollingInterval,
            slideoverPollingInterval:
              newConfig.slideoverPollingInterval ||
              getDefaultConfig().slideoverPollingInterval,
            listPollingInterval:
              newConfig.listPollingInterval ||
              getDefaultConfig().listPollingInterval,
          });
        } catch (error) {
          console.error("Error parsing storage change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const updatePollingConfig = React.useCallback(
    (newConfig: {
      mainPollingInterval?: number;
      slideoverPollingInterval?: number;
      listPollingInterval?: number;
    }) => {
      const updated = {
        mainPollingInterval:
          newConfig.mainPollingInterval !== undefined
            ? newConfig.mainPollingInterval
            : config.mainPollingInterval,
        slideoverPollingInterval:
          newConfig.slideoverPollingInterval !== undefined
            ? newConfig.slideoverPollingInterval
            : config.slideoverPollingInterval,
        listPollingInterval:
          newConfig.listPollingInterval !== undefined
            ? newConfig.listPollingInterval
            : config.listPollingInterval,
      };

      try {
        localStorage.setItem(
          POLLING_CONFIG_STORAGE_KEY,
          JSON.stringify(updated),
        );
        setConfig(updated);
      } catch (e) {
        console.error("Error saving polling config to localStorage:", e);
      }
    },
    [config],
  );

  const getPollingInterval = React.useCallback(() => {
    return config.mainPollingInterval;
  }, [config.mainPollingInterval]);

  const getSlideoverInterval = React.useCallback(() => {
    return config.slideoverPollingInterval;
  }, [config.slideoverPollingInterval]);

  const getListPollingInterval = React.useCallback(() => {
    return config.listPollingInterval;
  }, [config.listPollingInterval]);

  return (
    <PollingConfigContext.Provider
      value={{
        mainPollingInterval: config.mainPollingInterval,
        slideoverPollingInterval: config.slideoverPollingInterval,
        listPollingInterval: config.listPollingInterval,
        updatePollingConfig,
        getPollingInterval,
        getSlideoverInterval,
        getListPollingInterval,
      }}
    >
      {children}
    </PollingConfigContext.Provider>
  );
};
