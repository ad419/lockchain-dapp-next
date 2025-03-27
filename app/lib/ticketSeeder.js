const fs = require("fs");
const path = require("path");

const generateTicketNumber = (prize) => {
  if (prize === 250) {
    return Math.floor(10000 + Math.random() * 90000).toString();
  } else if (prize > 0) {
    return Math.floor(1000 + Math.random() * 9000).toString();
  } else {
    return Math.floor(100 + Math.random() * 900).toString();
  }
};

const generateTickets = () => {
  let tickets = [];
  let totalPrizePool = 5000; // $5000 total prize pool
  let remainingPrizePool = totalPrizePool;

  // Two $100 tickets ($200 total)
  for (let i = 1; i <= 2; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(100),
      prize: 100,
      claimed: false,
      claimedBy: "",
      contactInfo: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
      status: "active",
    });
    remainingPrizePool -= 100;
  }

  // Two $50 tickets ($100 total)
  for (let i = 1; i <= 2; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(50),
      prize: 50,
      claimed: false,
      claimedBy: "",
      contactInfo: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
      status: "active",
    });
    remainingPrizePool -= 50;
  }

  // Ten $10 tickets ($100 total)
  for (let i = 1; i <= 10; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(10),
      prize: 10,
      claimed: false,
      claimedBy: "",
      contactInfo: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
      status: "active",
    });
    remainingPrizePool -= 10;
  }

  // 920 tickets with $5 prize ($4600 total)
  for (let i = 1; i <= 920; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(5),
      prize: 5,
      claimed: false,
      claimedBy: "",
      contactInfo: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
      status: "active",
    });
    remainingPrizePool -= 5;
  }

  // 1066 tickets with $0 prize
  for (let i = 1; i <= 1066; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(0),
      prize: 0,
      claimed: false,
      claimedBy: "",
      contactInfo: null,
      createdAt: new Date().toISOString(),
      claimedAt: null,
      status: "active",
    });
  }

  // Verify total prize pool
  const actualTotal = tickets.reduce((sum, ticket) => sum + ticket.prize, 0);
  console.log(`Total prize pool: $${actualTotal}`);
  if (actualTotal !== totalPrizePool) {
    throw new Error(`Prize pool mismatch: ${actualTotal} != ${totalPrizePool}`);
  }

  // Verify total number of tickets
  const totalTickets = tickets.length;
  console.log(`Total number of tickets: ${totalTickets}`);
  if (totalTickets !== 2000) {
    throw new Error(`Total tickets mismatch: ${totalTickets} != 2000`);
  }

  return tickets;
};

const generateJson = () => {
  const tickets = generateTickets();
  const jsonData = JSON.stringify({ tickets }, null, 2);
  const outputPath = path.join(__dirname, "..", "data", "tickets.json");

  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  // Write JSON file
  fs.writeFileSync(outputPath, jsonData);
  console.log(`Generated ${tickets.length} tickets in ${outputPath}`);
};

// Generate JSON file
generateJson();
