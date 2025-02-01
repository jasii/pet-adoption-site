const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const db = new sqlite3.Database("./pets.db");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// Serve the React app
app.use(express.static(path.join(__dirname, "../build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../build", "index.html"));
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Initialize database with new fields
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS pets (id INTEGER PRIMARY KEY, name TEXT, description TEXT, image TEXT, adopted_by TEXT, adopter_ip TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS page_details (id INTEGER PRIMARY KEY, title TEXT, description TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS website_title (id INTEGER PRIMARY KEY, title TEXT)");

  // Seed database with initial data
  db.run("DELETE FROM pets"); // Clear existing data

  const stmt = db.prepare("INSERT INTO pets (id, name, description, image) VALUES (?, ?, ?, ?)");
  const pets = [
    { id: 1, name: "Buddy", description: "Friendly dog looking for a home.", image: "/images/1.jpg" },
    { id: 2, name: "Luna", description: "A sweet pup who loves to cuddle.", image: "/images/2.png" },
    { id: 3, name: "Charlie", description: "Energetic and playful pup.", image: "/images/3.jpg" },
    { id: 4, name: "Max", description: "Loyal and loving dog.", image: "/images/4.png" },
    { id: 5, name: "Bella", description: "Gentle and affectionate good boy.", image: "/images/5.png" },
    { id: 6, name: "Lucy", description: "Playful and curious puppy.", image: "/images/6.jpg" }
  ];

  pets.forEach(pet => {
    stmt.run(pet.id, pet.name, pet.description, pet.image);
  });

  stmt.finalize();

  // Seed page details if not exists
  db.get("SELECT COUNT(*) AS count FROM page_details", (err, row) => {
    if (err) return console.error(err.message);
    if (row.count === 0) {
      db.run("INSERT INTO page_details (title, description) VALUES (?, ?)", ["Welcome to the Pet Adoption Center", "Here you can find a variety of pets looking for a loving home. Browse through the list of available pets and adopt one today!"]);
    }
  });

  // Seed website title if not exists
  db.get("SELECT COUNT(*) AS count FROM website_title", (err, row) => {
    if (err) return console.error(err.message);
    if (row.count === 0) {
      db.run("INSERT INTO website_title (title) VALUES (?)", ["Pet Adoption Site"]);
    }
  });
});

// Get pet adoption status
app.get("/pets", (req, res) => {
  db.all("SELECT * FROM pets", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Check if IP has already adopted
app.get("/check-adoption/:ip", (req, res) => {
  const ip = req.params.ip;
  console.log(`Checking adoption status for IP: ${ip}`);
  db.get("SELECT * FROM pets WHERE adopter_ip = ?", [ip], (err, row) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ hasAdopted: !!row });
  });
});

// Adopt a pet
app.post("/adopt", (req, res) => {
  const { id, adopteeName } = req.body;
  const ip = req.ip; // Get client IP

  // Check if IP has already adopted
  db.get("SELECT * FROM pets WHERE adopter_ip = ?", [ip], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: "You have already adopted a pet" });

    // Proceed with adoption
    db.run(
      "UPDATE pets SET adopted_by = ?, adopter_ip = ? WHERE id = ?",
      [adopteeName, ip, id],
      async (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Send Telegram notification
        const message = `Pet: ${id} has been adopted by ${adopteeName} (IP: ${ip})`;
        const TELEGRAM_WEBHOOK_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        await fetch(TELEGRAM_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
        });

        res.json({ message: "Pet adopted successfully" });
      }
    );
  });
});

// New endpoint to fetch IP address
app.get("/get-ip", async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch("https://api64.ipify.org?format=json");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching IP:", error);
    res.status(500).json({ error: "Error fetching IP" });
  }
});

// Add a new animal with image upload
app.post("/add-animal", upload.single("image"), (req, res) => {
  const { name, description } = req.body;
  const imageUrl = `/images/${req.file.filename}`;
  db.run(
    "INSERT INTO pets (name, description, image) VALUES (?, ?, ?)",
    [name, description, imageUrl],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Remove an animal
app.delete("/remove-animal/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM pets WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Update an animal's details
app.put("/update-animal/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const imageUrl = req.file ? `/images/${req.file.filename}` : null;

  const query = imageUrl
    ? "UPDATE pets SET name = ?, description = ?, image = ? WHERE id = ?"
    : "UPDATE pets SET name = ?, description = ? WHERE id = ?";

  const params = imageUrl
    ? [name, description, imageUrl, id]
    : [name, description, id];

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Get page details
app.get("/page-details", (req, res) => {
  db.get("SELECT * FROM page_details WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Update page details
app.put("/update-page-details", (req, res) => {
  const { title, description } = req.body;
  db.run(
    "UPDATE page_details SET title = ?, description = ? WHERE id = 1",
    [title, description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Get website title
app.get("/website-title", (req, res) => {
  db.get("SELECT * FROM website_title WHERE id = 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Update website title
app.put("/update-website-title", (req, res) => {
  const { title } = req.body;
  db.run(
    "UPDATE website_title SET title = ? WHERE id = 1",
    [title],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Mark an animal as not adopted
app.put("/unadopt-animal/:id", (req, res) => {
  const { id } = req.params;
  db.run(
    "UPDATE pets SET adopted_by = NULL, adopter_ip = NULL WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Set the port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));