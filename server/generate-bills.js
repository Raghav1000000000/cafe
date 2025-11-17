// Temporary script to generate bills from existing orders
const fs = require('fs');
const path = require('path');

// Read the server data
const dataPath = path.join(__dirname, 'data.js');
const serverPath = path.join(__dirname, 'index.js');

// Read the data file
const dataContent = fs.readFileSync(dataPath, 'utf8');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Extract orders from server (this is a simple approach)
console.log('Generating bills from existing orders...');

// For now, let's manually create bills based on the orders we know exist
const bills = [
  {
    id: "BILL-1763184248360",
    tableNumber: 4,
    customerName: "h",
    items: [{"id":"tea-1","name":"Masala Chai","price":30,"available":true,"quantity":5}],
    subtotal: 150,
    tax: 8, // 5% of 150
    service: 3, // 2% of 150
    total: 161,
    createdAt: 1763184248360
  },
  {
    id: "BILL-1763184601755",
    tableNumber: 2,
    customerName: "varshit",
    items: [{"id":"snack-1","name":"Samosa","price":20,"available":true,"quantity":2}],
    subtotal: 40,
    tax: 2, // 5% of 40
    service: 1, // 2% of 40
    total: 43,
    createdAt: 1763184601755
  }
];

console.log('Generated bills:', bills);
console.log('To populate the server, you can manually add these bills to the bills array in index.js');
console.log('Or restart the server and use the kitchen dashboard to generate bills from orders.');