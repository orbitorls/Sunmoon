/**
 * Service Worker Registration and Management
 * Handles SW lifecycle, updates, and cache management
 */

const ENABLE_SW = process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === "true";

export interface ServiceWorkerState {
  registered: boolean;
  installing: boolean;
  waiting: boolean;
  active: boolean;
  error: string | null;
  cacheSize: number;
  lastUpdate: string | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private registeringPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  private listeners: Array<(state: ServiceWorkerState) => void> = [];

  /**
   * Register service worker and handle lifecycle
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!ENABLE_SW) {
      console.info(
        "[SW Manager] Service worker disabled via NEXT_PUBLIC_ENABLE_SERVICE_WORKER",
      );
      return null;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("[SW Manager] Service Worker not supported");
      return null;
    }

    if (this.registration) {
      return this.registration;
    }

    if (this.registeringPromise) {
      return this.registeringPromise;
    }

    this.registeringPromise = this.doRegister();
    return this.registeringPromise;
  }

  private async doRegister(): Promise<ServiceWorkerRegistration | null> {
    try {
      console.log("[SW Manager] Registering service worker...");

      this.registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // Always check for updates
      });

      console.log("[SW Manager] Service Worker registered:", this.registration);

      // Handle updates
      this.registration.addEventListener("updatefound", () => {
        console.log("[SW Manager] Update found");
        const newWorker = this.registration?.installing;

        if (newWorker) {
          this.notifyListeners();

          newWorker.addEventListener("statechange", () => {
            console.log("[SW Manager] Worker state changed:", newWorker.state);
            this.notifyListeners();

            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              console.log("[SW Manager] New version available");
              this.promptForUpdate();
            }
          });
        }
      });

      // Check for updates every 30 minutes
      setInterval(
        () => {
          this.checkForUpdates();
        },
        30 * 60 * 1000,
      );

      // Initial state notification
      this.notifyListeners();

      return this.registration;
    } catch (error) {
      console.error("[SW Manager] Registration failed:", error);
      this.notifyListeners();
      return null;
    } finally {
      this.registeringPromise = null;
    }
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!ENABLE_SW || !this.registration) return;

    try {
      console.log("[SW Manager] Checking for updates...");
      await this.registration.update();
    } catch (error) {
      console.error("[SW Manager] Update check failed:", error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!ENABLE_SW || !this.registration?.waiting) return;

    console.log("[SW Manager] Skipping waiting...");

    // Send skip waiting message
    this.registration.waiting.postMessage({ type: "SKIP_WAITING" });

    // Wait for controller change
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[SW Manager] Controller changed, reloading...");
        resolve();
      });
    });

    // Reload page to use new service worker
    window.location.reload();
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<boolean> {
    if (!ENABLE_SW) return false;

    const controller = navigator.serviceWorker.controller;
    if (!controller) return false;

    console.log("[SW Manager] Clearing cache...");

    return new Promise<boolean>((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      controller.postMessage({ type: "CLEAR_CACHE" }, [messageChannel.port2]);
    });
  }

  /**
   * Get total cache size
   */
  async getCacheSize(): Promise<number> {
    if (!ENABLE_SW) return 0;

    const controller = navigator.serviceWorker.controller;
    if (!controller) return 0;

    return new Promise<number>((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      controller.postMessage({ type: "GET_CACHE_SIZE" }, [
        messageChannel.port2,
      ]);

      // Timeout after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  }

  /**
   * Get current service worker state
   */
  getState(): ServiceWorkerState {
    const reg = this.registration;

    return {
      registered: !!reg,
      installing: !!reg?.installing,
      waiting: !!reg?.waiting,
      active: !!reg?.active,
      error: null,
      cacheSize: 0,
      lastUpdate: reg?.active ? new Date().toISOString() : null,
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ServiceWorkerState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Prompt user to update to new version
   */
  private promptForUpdate(): void {
    if (typeof window === "undefined") return;

    // Show notification or update UI
    const event = new CustomEvent("sw-update-available", {
      detail: { registration: this.registration },
    });
    window.dispatchEvent(event);
  }
}

// Singleton instance
export const swManager = new ServiceWorkerManager();

// Export convenience functions
export const registerServiceWorker = () => swManager.register();
export const getCacheSize = () => swManager.getCacheSize();
export const clearCache = () => swManager.clearCache();

// Auto-register on client side
if (typeof window !== "undefined" && ENABLE_SW) {
  const triggerRegistration = () => {
    void swManager.register();
  };

  if (document.readyState === "complete") {
    triggerRegistration();
  } else {
    window.addEventListener("load", triggerRegistration);
  }
} else if (typeof window !== "undefined") {
  console.info(
    "[SW Manager] Auto-registration skipped; service worker disabled",
  );
}
