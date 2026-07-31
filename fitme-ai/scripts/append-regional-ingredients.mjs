import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const p = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "prisma",
  "seed",
  "catalog",
  "ingredients.global.json",
);
const j = JSON.parse(fs.readFileSync(p, "utf8"));

const extra = [
  { slug: "oats-rolled", name: "Oats, rolled dry", aliases: ["oats", "rolled oats"], sourceLabel: "USDA FDC #169705", energyKcal: 379, proteinG: 13.2, carbsG: 67.7, fatG: 6.5, fibreG: 10.1, sugarG: 0.8, sodiumMg: 2 },
  { slug: "peanut-butter", name: "Peanut butter", aliases: ["pb"], sourceLabel: "USDA FDC #172430", energyKcal: 588, proteinG: 25.1, carbsG: 20.3, fatG: 49.9, fibreG: 6.4, sugarG: 9.2, sodiumMg: 430 },
  { slug: "bacon-cooked", name: "Bacon, cooked", aliases: ["bacon"], sourceLabel: "USDA FDC #168277", energyKcal: 541, proteinG: 37, carbsG: 1.4, fatG: 41.8, fibreG: 0, sugarG: 0, sodiumMg: 1717 },
  { slug: "ground-beef-cooked", name: "Ground beef, cooked", aliases: ["ground beef"], sourceLabel: "USDA FDC #174036", energyKcal: 250, proteinG: 25.9, carbsG: 0, fatG: 15.4, fibreG: 0, sugarG: 0, sodiumMg: 72 },
  { slug: "pasta-cooked", name: "Pasta, cooked", aliases: ["pasta"], sourceLabel: "USDA FDC #169758", energyKcal: 157, proteinG: 5.8, carbsG: 30.7, fatG: 0.9, fibreG: 1.8, sugarG: 0.6, sodiumMg: 1 },
  { slug: "cheddar-cheese", name: "Cheddar cheese", aliases: ["cheese", "cheddar"], sourceLabel: "USDA FDC #173414", energyKcal: 403, proteinG: 22.9, carbsG: 3.1, fatG: 33.3, fibreG: 0, sugarG: 0.5, sodiumMg: 621 },
  { slug: "greek-yogurt", name: "Greek yogurt, plain", aliases: ["greek yogurt", "yogurt"], sourceLabel: "USDA FDC #170903", energyKcal: 97, proteinG: 9, carbsG: 3.6, fatG: 5, fibreG: 0, sugarG: 3.2, sodiumMg: 36 },
  { slug: "avocado-raw", name: "Avocado, raw", aliases: ["avocado"], sourceLabel: "USDA FDC #171705", energyKcal: 160, proteinG: 2, carbsG: 8.5, fatG: 14.7, fibreG: 6.7, sugarG: 0.7, sodiumMg: 7 },
  { slug: "apple-raw", name: "Apple, raw", aliases: ["apple"], sourceLabel: "USDA FDC #171688", energyKcal: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2, fibreG: 2.4, sugarG: 10.4, sodiumMg: 1 },
  { slug: "lettuce-raw", name: "Lettuce, raw", aliases: ["lettuce"], sourceLabel: "USDA FDC #169247", energyKcal: 15, proteinG: 1.4, carbsG: 2.9, fatG: 0.2, fibreG: 1.3, sugarG: 0.8, sodiumMg: 28 },
  { slug: "salmon-cooked", name: "Salmon, cooked", aliases: ["salmon"], sourceLabel: "USDA FDC #175154", energyKcal: 206, proteinG: 22.1, carbsG: 0, fatG: 12.4, fibreG: 0, sugarG: 0, sodiumMg: 59 },
  { slug: "butter-salted", name: "Butter, salted", aliases: ["butter"], sourceLabel: "USDA FDC #173410", energyKcal: 717, proteinG: 0.9, carbsG: 0.1, fatG: 81.1, fibreG: 0, sugarG: 0.1, sodiumMg: 643 },
  { slug: "mozzarella-cheese", name: "Mozzarella cheese", aliases: ["mozzarella"], sourceLabel: "USDA FDC #170851", energyKcal: 299, proteinG: 22.2, carbsG: 2.4, fatG: 22.4, fibreG: 0, sugarG: 1, sodiumMg: 627 },
  { slug: "olive-oil", name: "Olive oil", aliases: ["olive oil"], sourceLabel: "USDA FDC #171413", energyKcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fibreG: 0, sugarG: 0, sodiumMg: 2 },
  { slug: "bagel-plain", name: "Bagel, plain", aliases: ["bagel"], sourceLabel: "USDA FDC #168833", energyKcal: 257, proteinG: 10.1, carbsG: 50.2, fatG: 1.7, fibreG: 2.1, sugarG: 5.1, sodiumMg: 430 },
  { slug: "croissant", name: "Croissant", aliases: ["croissant"], sourceLabel: "USDA FDC #168831", energyKcal: 406, proteinG: 8.2, carbsG: 45.8, fatG: 21, fibreG: 2.6, sugarG: 11.3, sodiumMg: 384 },
  { slug: "paneer", name: "Paneer", aliases: ["paneer"], sourceLabel: "USDA FDC approx (paneer)", energyKcal: 265, proteinG: 18.3, carbsG: 1.2, fatG: 20.8, fibreG: 0, sugarG: 1.2, sodiumMg: 18 },
  { slug: "ghee", name: "Ghee", aliases: ["ghee"], sourceLabel: "USDA FDC approx (ghee)", energyKcal: 900, proteinG: 0, carbsG: 0, fatG: 100, fibreG: 0, sugarG: 0, sodiumMg: 0 },
  { slug: "basmati-rice-cooked", name: "Basmati rice, cooked", aliases: ["basmati"], sourceLabel: "USDA FDC approx (basmati cooked)", energyKcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3, fibreG: 0.4, sugarG: 0.1, sodiumMg: 1 },
  { slug: "chickpea-flour", name: "Chickpea flour (besan)", aliases: ["besan"], sourceLabel: "USDA FDC approx (besan)", energyKcal: 387, proteinG: 22.4, carbsG: 57.8, fatG: 6.7, fibreG: 10.8, sugarG: 10.8, sodiumMg: 64 },
  { slug: "spinach-cooked", name: "Spinach, cooked", aliases: ["spinach", "palak"], sourceLabel: "USDA FDC #168462", energyKcal: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.3, fibreG: 2.4, sugarG: 0.4, sodiumMg: 70 },
  { slug: "cauliflower-raw", name: "Cauliflower, raw", aliases: ["cauliflower", "gobi"], sourceLabel: "USDA FDC #169986", energyKcal: 25, proteinG: 1.9, carbsG: 5, fatG: 0.3, fibreG: 2, sugarG: 1.9, sodiumMg: 30 },
  { slug: "kidney-beans-cooked", name: "Kidney beans, cooked", aliases: ["rajma"], sourceLabel: "USDA FDC #175237", energyKcal: 127, proteinG: 8.7, carbsG: 22.8, fatG: 0.5, fibreG: 7.4, sugarG: 0.3, sodiumMg: 2 },
  { slug: "semolina-dry", name: "Semolina, dry", aliases: ["semolina", "rava"], sourceLabel: "USDA FDC #169762", energyKcal: 360, proteinG: 12.7, carbsG: 72.8, fatG: 1.1, fibreG: 3.9, sugarG: 0.4, sodiumMg: 1 },
  { slug: "flattened-rice", name: "Flattened rice (poha)", aliases: ["poha"], sourceLabel: "IFCT approx (poha)", energyKcal: 360, proteinG: 6.6, carbsG: 79.3, fatG: 1.1, fibreG: 1.4, sugarG: 0.5, sodiumMg: 5 },
  { slug: "feta-cheese", name: "Feta cheese", aliases: ["feta"], sourceLabel: "USDA FDC #173420", energyKcal: 264, proteinG: 14.2, carbsG: 4.1, fatG: 21.3, fibreG: 0, sugarG: 4.1, sodiumMg: 1116 },
  { slug: "sausage-pork-cooked", name: "Pork sausage, cooked", aliases: ["sausage"], sourceLabel: "USDA FDC #168322", energyKcal: 339, proteinG: 13.3, carbsG: 2.4, fatG: 30.3, fibreG: 0, sugarG: 1.3, sodiumMg: 849 },
  { slug: "pita-bread", name: "Pita bread", aliases: ["pita"], sourceLabel: "USDA FDC approx (pita)", energyKcal: 275, proteinG: 9.1, carbsG: 55.7, fatG: 1.2, fibreG: 2.2, sugarG: 1.3, sodiumMg: 536 },
  { slug: "cream-cheese", name: "Cream cheese", aliases: ["cream cheese"], sourceLabel: "USDA FDC #173418", energyKcal: 342, proteinG: 5.9, carbsG: 4.1, fatG: 34.4, fibreG: 0, sugarG: 3.2, sodiumMg: 314 },
];

const slugs = new Set(j.ingredients.map((i) => i.slug));
for (const ing of extra) {
  if (!slugs.has(ing.slug)) {
    j.ingredients.push(ing);
    slugs.add(ing.slug);
  }
}
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log("ingredients", j.ingredients.length);
