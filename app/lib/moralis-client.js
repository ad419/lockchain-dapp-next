import Moralis from "moralis";

// Track initialization state
let isInitialized = false;
let initializationPromise = null;

/**
 * Gets a properly initialized Moralis client
 * Uses singleton pattern to prevent multiple initializations
 */
export async function getMoralisClient() {
  // If already initialized, return immediately
  if (isInitialized) {
    return Moralis;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise;
    return Moralis;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Check if Moralis is already initialized with a more reliable method
      try {
        // This simple property check is a safer way to detect initialization
        if (Moralis.Core?.config?.apiKey) {
          console.log("✓ Moralis already initialized");
          isInitialized = true;
          return Moralis;
        }
        throw new Error("Modules not started"); // Force initialization if no API key
      } catch (error) {
        // Only initialize if not yet started
        if (
          error.message?.includes("Modules not started") ||
          !Moralis.Core?.config?.apiKey
        ) {
          console.log("→ Starting Moralis with API key...");
          await Moralis.start({
            apiKey: process.env.MORALIS_API_KEY,
          });
          console.log("✓ Moralis initialized successfully");
        } else {
          // If it's a different error, re-throw it
          throw error;
        }
      }

      isInitialized = true;
      return Moralis;
    } catch (error) {
      console.error("❌ Failed to initialize Moralis:", error);
      throw error;
    } finally {
      // Always clear the promise when done
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}
