const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin with service account
const serviceAccount = require("../config/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://lockchain-tickets-3eb4d.firebaseio.com`, // Add this line
  projectId: "lockchain-tickets-3eb4d",
});

const db = admin.firestore();

const sanitizeTicket = (ticket) => {
  return {
    ticketNumber: String(ticket.ticketNumber),
    prize: Number(ticket.prize),
    claimed: Boolean(ticket.claimed),
    claimedBy: String(ticket.claimedBy || ""),
    contactInfo: null,
    createdAt: admin.firestore.Timestamp.fromDate(new Date(ticket.createdAt)),
    status: String(ticket.status),
  };
};

const seedFromJson = async () => {
  try {
    const jsonPath = path.join(__dirname, "..", "data", "tickets.json");
    console.log("Reading JSON file from:", jsonPath);

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    console.log(`Found ${jsonData.tickets.length} tickets to process`);

    console.log("Starting database seeding...");
    let successCount = 0;
    let errorCount = 0;

    // Reduce batch size for better reliability
    const batchSize = 500;
    let currentBatch = db.batch();
    let operationCount = 0;
    let batchNumber = 1;

    for (const ticket of jsonData.tickets) {
      try {
        const sanitizedTicket = sanitizeTicket(ticket);
        const docRef = db.collection("tickets").doc();
        currentBatch.set(docRef, sanitizedTicket);
        operationCount++;

        // Commit batch when it reaches batch size
        if (operationCount === batchSize) {
          console.log(`Preparing to commit batch ${batchNumber}...`);
          try {
            const commitPromise = currentBatch.commit();
            // Add timeout to catch hanging commits
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Batch commit timeout")), 30000)
            );

            await Promise.race([commitPromise, timeoutPromise]);
            console.log(`Batch ${batchNumber} committed successfully`);

            currentBatch = db.batch();
            operationCount = 0;
            batchNumber++;
            successCount += batchSize;

            // Add a longer delay between batches
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (commitError) {
            console.error(
              `Error committing batch ${batchNumber}:`,
              commitError
            );
            errorCount += operationCount;
            // Reset batch after error
            currentBatch = db.batch();
            operationCount = 0;
            batchNumber++;
            // Add longer delay after error
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      } catch (error) {
        console.error(
          `Error processing ticket #${ticket.ticketNumber}:`,
          error.message
        );
        errorCount++;
      }
    }

    // Commit any remaining documents
    if (operationCount > 0) {
      console.log(`Committing final batch with ${operationCount} documents...`);
      try {
        await currentBatch.commit();
        console.log("Final batch committed successfully");
        successCount += operationCount;
      } catch (error) {
        console.error("Error committing final batch:", error);
        errorCount += operationCount;
      }
    }

    console.log(`
Seeding completed:
- Successfully added: ${successCount} tickets
- Failed: ${errorCount} tickets
- Total processed: ${jsonData.tickets.length} tickets
- Total batches: ${batchNumber}
    `);
  } catch (error) {
    console.error("Fatal error during seeding:", error.message);
    throw error;
  } finally {
    console.log("Cleaning up Firebase Admin connection...");
    try {
      await admin.app().delete();
      console.log("Cleanup successful");
    } catch (error) {
      console.error("Error during cleanup:", error.message);
    }
  }
};

// Run seeder
if (require.main === module) {
  seedFromJson()
    .then(() => {
      console.log("Process complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
