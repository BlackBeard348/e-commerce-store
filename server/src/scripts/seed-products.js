import dotenv from "dotenv";
import mongoose from "mongoose";
import { Product } from "../models/product.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27018/ecommerce_store";
const TOTAL_PRODUCTS = 1000;

const categories = ["Accessories", "Electronics", "Home", "Footwear", "Fitness", "Apparel"];
const adjectives = ["Classic", "Modern", "Urban", "Prime", "Summit", "Apex", "Nimbus", "Nova"];
const nouns = ["Backpack", "Headphones", "Lamp", "Sneakers", "Bottle", "Jacket", "Watch", "Speaker"];

function makeProduct(index) {
  const category = categories[index % categories.length];
  const adjective = adjectives[index % adjectives.length];
  const noun = nouns[index % nouns.length];
  const name = `${adjective} ${noun} ${index + 1}`;
  const priceCents = 1500 + ((index * 137) % 45000);

  return {
    sku: `SKU-${String(index + 1).padStart(5, "0")}`,
    name,
    description: `${name} built for everyday use with reliable quality and practical details.`,
    priceCents,
    currency: "USD",
    images: [
      {
        url: `https://picsum.photos/seed/ecom-${index + 1}/640/480`,
        alt: `${name} product image`
      }
    ],
    category,
    tags: [category.toLowerCase(), noun.toLowerCase()],
    active: true,
    featured: index % 20 === 0,
    stockStatus: index % 13 === 0 ? "out_of_stock" : "in_stock"
  };
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  await Product.deleteMany({});
  const products = Array.from({ length: TOTAL_PRODUCTS }, (_, index) => makeProduct(index));
  await Product.insertMany(products, { ordered: true });
  console.log(`Seeded ${TOTAL_PRODUCTS} products`);
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await mongoose.disconnect();
    process.exit(1);
  });
