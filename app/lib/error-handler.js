/**
 * Handles common Firestore errors with appropriate actions
 */
export function handleFirestoreError(error, context = "") {
  const errorCode = error?.code;
  const errorMessage = error?.message || "";
  const errorDetails = error?.details || "";

  // Log the error with context
  console.error(`[${context}] Firestore error:`, {
    code: errorCode,
    message: errorMessage,
    details: errorDetails,
  });

  // Handle specific error types
  if (errorCode === 8 || errorDetails.includes("Quota exceeded")) {
    console.warn(`[${context}] Quota exceeded - implementing backoff`);
    return {
      isQuotaError: true,
      retryAfter: 5000, // Suggest retrying after 5 seconds
      userMessage:
        "Service is temporarily unavailable due to high demand. Please try again later.",
    };
  }

  if (errorCode === "unavailable" || errorMessage.includes("unavailable")) {
    console.warn(`[${context}] Service unavailable - implementing backoff`);
    return {
      isUnavailableError: true,
      retryAfter: 3000, // Suggest retrying after 3 seconds
      userMessage: "Service temporarily unavailable. Please try again shortly.",
    };
  }

  // Default response for other errors
  return {
    isUnknownError: true,
    retryAfter: 1000,
    userMessage: "An error occurred. Please try again.",
  };
}

/**
 * Wraps Firestore operations with error handling and retry logic
 */
export async function safeFirestoreOperation(
  operation,
  context = "",
  attempts = 3
) {
  let currentAttempt = 0;

  while (currentAttempt < attempts) {
    try {
      return await operation();
    } catch (error) {
      currentAttempt++;
      const errorInfo = handleFirestoreError(error, context);

      if (currentAttempt >= attempts) {
        throw new Error(errorInfo.userMessage);
      }

      // Wait before retrying
      const backoffTime =
        errorInfo.retryAfter * Math.pow(2, currentAttempt - 1);
      console.log(
        `[${context}] Retrying after ${backoffTime}ms (attempt ${currentAttempt}/${attempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }
}
