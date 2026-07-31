import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma", "seed", "catalog");

const us = {
  locale: "us",
  foods: [
    { slug: "oatmeal", name: "Oatmeal", aliases: ["oats", "porridge"], kind: "composite", sourceLabel: "FitMe US — cooked oats bowl", recipe: { "oats-rolled": 40, "milk-whole": 180, "sugar-white": 5, "banana-raw": 30 }, servings: [{ name: "bowl", grams: 255 }] },
    { slug: "scrambled-eggs", name: "Scrambled eggs", aliases: ["scrambled eggs"], kind: "composite", sourceLabel: "FitMe US — 2 eggs scrambled", recipe: { "egg-whole": 100, "butter-salted": 8 }, servings: [{ name: "serving", grams: 108 }] },
    { slug: "bacon-strips", name: "Bacon (2 strips)", aliases: ["bacon"], kind: "simple", sourceLabel: "FitMe US — 2 bacon strips", recipe: { "bacon-cooked": 40 }, servings: [{ name: "2 strips", grams: 40 }] },
    { slug: "peanut-butter-toast", name: "Peanut butter toast", aliases: ["pb toast"], kind: "composite", sourceLabel: "FitMe US — PB toast", recipe: { "bread-white": 60, "peanut-butter": 20 }, servings: [{ name: "serving", grams: 80 }] },
    { slug: "greek-yogurt-cup", name: "Greek yogurt", aliases: ["greek yogurt"], kind: "simple", sourceLabel: "FitMe US — greek yogurt cup", recipe: { "greek-yogurt": 170 }, servings: [{ name: "cup", grams: 170 }] },
    { slug: "grilled-chicken-breast", name: "Grilled chicken breast", aliases: ["grilled chicken"], kind: "simple", sourceLabel: "FitMe US — grilled chicken", recipe: { "chicken-cooked": 120 }, servings: [{ name: "serving", grams: 120 }] },
    { slug: "cheeseburger", name: "Cheeseburger", aliases: ["burger", "cheeseburger"], kind: "composite", sourceLabel: "FitMe US — cheeseburger", recipe: { "ground-beef-cooked": 90, "bread-white": 60, "cheddar-cheese": 20, "lettuce-raw": 15, "tomato-raw": 20, "onion-red": 15 }, servings: [{ name: "burger", grams: 220 }] },
    { slug: "mac-and-cheese", name: "Mac and cheese", aliases: ["mac and cheese"], kind: "composite", sourceLabel: "FitMe US — mac and cheese", recipe: { "pasta-cooked": 180, "cheddar-cheese": 40, "milk-whole": 30, "butter-salted": 10 }, servings: [{ name: "bowl", grams: 260 }] },
    { slug: "french-fries", name: "French fries", aliases: ["fries"], kind: "composite", sourceLabel: "FitMe US — french fries", recipe: { "potato-boiled": 100, "coconut-oil": 20 }, servings: [{ name: "medium", grams: 120 }] },
    { slug: "pizza-slice", name: "Pizza slice", aliases: ["pizza"], kind: "composite", sourceLabel: "FitMe US — pizza slice", recipe: { "wheat-flour": 50, "mozzarella-cheese": 35, "tomato-raw": 25, "olive-oil": 10 }, servings: [{ name: "slice", grams: 120 }] },
    { slug: "caesar-salad", name: "Caesar salad", aliases: ["caesar salad"], kind: "composite", sourceLabel: "FitMe US — caesar salad", recipe: { "lettuce-raw": 120, "chicken-cooked": 50, "cheddar-cheese": 15, "olive-oil": 15 }, servings: [{ name: "bowl", grams: 200 }] },
    { slug: "bagel-cream-cheese", name: "Bagel with cream cheese", aliases: ["bagel"], kind: "composite", sourceLabel: "FitMe US — bagel + cream cheese", recipe: { "bagel-plain": 90, "cream-cheese": 30 }, servings: [{ name: "bagel", grams: 120 }] },
    { slug: "avocado-toast", name: "Avocado toast", aliases: ["avocado toast"], kind: "composite", sourceLabel: "FitMe US — avocado toast", recipe: { "bread-white": 60, "avocado-raw": 60, "olive-oil": 5 }, servings: [{ name: "slice", grams: 125 }] },
    { slug: "pancakes", name: "Pancakes (2)", aliases: ["pancakes"], kind: "composite", sourceLabel: "FitMe US — 2 pancakes", recipe: { "wheat-flour": 60, "egg-whole": 50, "milk-whole": 30, "sugar-white": 10, "butter-salted": 8 }, servings: [{ name: "2 pancakes", grams: 148 }] },
    { slug: "grilled-salmon", name: "Grilled salmon", aliases: ["salmon"], kind: "composite", sourceLabel: "FitMe US — grilled salmon", recipe: { "salmon-cooked": 130, "olive-oil": 10 }, servings: [{ name: "fillet", grams: 140 }] },
    { slug: "mashed-potatoes", name: "Mashed potatoes", aliases: ["mashed potatoes"], kind: "composite", sourceLabel: "FitMe US — mashed potatoes", recipe: { "potato-boiled": 160, "butter-salted": 15, "milk-whole": 20 }, servings: [{ name: "side", grams: 195 }] },
    { slug: "chicken-wings", name: "Chicken wings (6)", aliases: ["wings"], kind: "composite", sourceLabel: "FitMe US — chicken wings", recipe: { "chicken-cooked": 150, "coconut-oil": 15 }, servings: [{ name: "6 wings", grams: 165 }] },
    { slug: "burrito", name: "Burrito", aliases: ["burrito"], kind: "composite", sourceLabel: "FitMe US — chicken burrito", recipe: { "roti-chapati": 80, "chicken-cooked": 80, "rice-white-cooked": 80, "cheddar-cheese": 25, "tomato-raw": 20, "onion-red": 15, "lettuce-raw": 20 }, servings: [{ name: "burrito", grams: 300 }] },
    { slug: "coffee-latte", name: "Latte", aliases: ["latte", "coffee latte"], kind: "composite", sourceLabel: "FitMe US — latte", recipe: { "black-tea-brewed": 50, "milk-whole": 280, "sugar-white": 5 }, servings: [{ name: "cup", grams: 335 }] },
    { slug: "steak-sirloin", name: "Steak (sirloin)", aliases: ["steak"], kind: "composite", sourceLabel: "FitMe US — steak", recipe: { "ground-beef-cooked": 160, "butter-salted": 10, "olive-oil": 5 }, servings: [{ name: "steak", grams: 175 }] },
    { slug: "turkey-sandwich", name: "Turkey sandwich", aliases: ["sandwich"], kind: "composite", sourceLabel: "FitMe US — turkey sandwich", recipe: { "bread-white": 90, "chicken-cooked": 60, "lettuce-raw": 15, "tomato-raw": 15, "cheddar-cheese": 10 }, servings: [{ name: "sandwich", grams: 190 }] },
    { slug: "protein-shake", name: "Protein shake", aliases: ["protein shake"], kind: "composite", sourceLabel: "FitMe US — protein shake", recipe: { "milk-whole": 250, "greek-yogurt": 80, "banana-raw": 30, "peanut-butter": 15 }, servings: [{ name: "shake", grams: 375 }] },
    { slug: "apple-fruit", name: "Apple", aliases: ["apple"], kind: "simple", sourceLabel: "FitMe US — medium apple", recipe: { "apple-raw": 180 }, servings: [{ name: "medium", grams: 180 }] },
    { slug: "broccoli-side", name: "Broccoli (steamed)", aliases: ["broccoli"], kind: "simple", sourceLabel: "FitMe US — steamed greens side", recipe: { "spinach-cooked": 150 }, servings: [{ name: "side", grams: 150 }] },
    { slug: "cereal-with-milk", name: "Cereal with milk", aliases: ["cereal"], kind: "composite", sourceLabel: "FitMe US — cereal bowl", recipe: { "oats-rolled": 40, "milk-whole": 200, "sugar-white": 10, "banana-raw": 20 }, servings: [{ name: "bowl", grams: 270 }] },
  ],
};

const ind = {
  locale: "in",
  foods: [
    { slug: "idli", name: "Idli (2 pieces)", aliases: ["idli", "idly"], kind: "composite", sourceLabel: "FitMe IN — idli", recipe: { "rice-flour": 60, "urad-dhal-cooked": 40, "coconut-oil": 5 }, servings: [{ name: "2 pieces", grams: 105 }] },
    { slug: "plain-dosa", name: "Plain dosa", aliases: ["dosa", "dosai"], kind: "composite", sourceLabel: "FitMe IN — plain dosa", recipe: { "rice-flour": 55, "urad-dhal-cooked": 30, "coconut-oil": 8 }, servings: [{ name: "dosa", grams: 93 }] },
    { slug: "masala-dosa", name: "Masala dosa", aliases: ["masala dosa"], kind: "composite", sourceLabel: "FitMe IN — masala dosa", recipe: { "rice-flour": 55, "urad-dhal-cooked": 30, "potato-boiled": 60, "onion-red": 15, "coconut-oil": 12 }, servings: [{ name: "dosa", grams: 172 }] },
    { slug: "plain-naan", name: "Naan", aliases: ["naan"], kind: "composite", sourceLabel: "FitMe IN — naan", recipe: { "wheat-flour": 55, "greek-yogurt": 20, "ghee": 8, "sugar-white": 5 }, servings: [{ name: "naan", grams: 88 }] },
    { slug: "basmati-rice", name: "Basmati rice", aliases: ["basmati", "basmati rice"], kind: "simple", sourceLabel: "FitMe IN — basmati rice", recipe: { "basmati-rice-cooked": 150 }, servings: [{ name: "medium", grams: 150 }] },
    { slug: "dal-tadka", name: "Dal tadka", aliases: ["dal tadka"], kind: "composite", sourceLabel: "FitMe IN — dal tadka", recipe: { "lentils-red-cooked": 120, "ghee": 10, "onion-red": 15, "tomato-raw": 20, "garlic-raw": 3, "ginger-raw": 3, "curry-powder": 2 }, servings: [{ name: "bowl", grams: 173 }] },
    { slug: "chana-masala", name: "Chana masala", aliases: ["chana masala", "chole"], kind: "composite", sourceLabel: "FitMe IN — chana masala", recipe: { "chickpeas-cooked": 120, "tomato-raw": 30, "onion-red": 15, "ghee": 8, "ginger-raw": 3, "curry-powder": 3 }, servings: [{ name: "bowl", grams: 179 }] },
    { slug: "butter-chicken", name: "Butter chicken", aliases: ["butter chicken"], kind: "composite", sourceLabel: "FitMe IN — butter chicken", recipe: { "chicken-cooked": 100, "tomato-raw": 40, "butter-salted": 15, "greek-yogurt": 30, "onion-red": 10, "ghee": 8, "ginger-raw": 3 }, servings: [{ name: "bowl", grams: 206 }] },
    { slug: "chicken-biryani", name: "Chicken biryani", aliases: ["biryani", "chicken biryani"], kind: "composite", sourceLabel: "FitMe IN — chicken biryani", recipe: { "basmati-rice-cooked": 200, "chicken-cooked": 80, "onion-red": 25, "tomato-raw": 15, "ghee": 12, "greek-yogurt": 20 }, servings: [{ name: "plate", grams: 352 }] },
    { slug: "veg-biryani", name: "Vegetable biryani", aliases: ["veg biryani"], kind: "composite", sourceLabel: "FitMe IN — veg biryani", recipe: { "basmati-rice-cooked": 200, "potato-boiled": 40, "carrot-raw": 25, "onion-red": 20, "ghee": 12, "tomato-raw": 15 }, servings: [{ name: "plate", grams: 312 }] },
    { slug: "samosa", name: "Samosa (2)", aliases: ["samosa"], kind: "composite", sourceLabel: "FitMe IN — samosa", recipe: { "wheat-flour": 35, "potato-boiled": 40, "onion-red": 10, "coconut-oil": 15 }, servings: [{ name: "2 pieces", grams: 100 }] },
    { slug: "pakora", name: "Pakora", aliases: ["pakora"], kind: "composite", sourceLabel: "FitMe IN — pakora", recipe: { "chickpea-flour": 35, "onion-red": 20, "potato-boiled": 15, "coconut-oil": 12 }, servings: [{ name: "serving", grams: 82 }] },
    { slug: "poha", name: "Poha", aliases: ["poha"], kind: "composite", sourceLabel: "FitMe IN — poha", recipe: { "flattened-rice": 60, "onion-red": 20, "potato-boiled": 25, "peanut-butter": 8, "coconut-oil": 8 }, servings: [{ name: "bowl", grams: 121 }] },
    { slug: "sambar", name: "Sambar", aliases: ["sambar"], kind: "composite", sourceLabel: "FitMe IN — sambar", recipe: { "lentils-red-cooked": 80, "tomato-raw": 25, "onion-red": 15, "carrot-raw": 20, "coconut-oil": 8, "curry-powder": 3 }, servings: [{ name: "bowl", grams: 151 }] },
    { slug: "palak-paneer", name: "Palak paneer", aliases: ["palak paneer"], kind: "composite", sourceLabel: "FitMe IN — palak paneer", recipe: { "paneer": 80, "spinach-cooked": 70, "onion-red": 10, "tomato-raw": 10, "ghee": 10, "garlic-raw": 3 }, servings: [{ name: "bowl", grams: 183 }] },
    { slug: "paneer-tikka", name: "Paneer tikka", aliases: ["paneer tikka"], kind: "composite", sourceLabel: "FitMe IN — paneer tikka", recipe: { "paneer": 90, "greek-yogurt": 20, "onion-red": 10, "coconut-oil": 8 }, servings: [{ name: "serving", grams: 128 }] },
    { slug: "tandoori-chicken", name: "Tandoori chicken", aliases: ["tandoori chicken"], kind: "composite", sourceLabel: "FitMe IN — tandoori chicken", recipe: { "chicken-cooked": 120, "greek-yogurt": 20, "onion-red": 10, "ginger-raw": 5, "garlic-raw": 3, "coconut-oil": 8 }, servings: [{ name: "serving", grams: 166 }] },
    { slug: "rajma", name: "Rajma", aliases: ["rajma"], kind: "composite", sourceLabel: "FitMe IN — rajma", recipe: { "kidney-beans-cooked": 120, "tomato-raw": 30, "onion-red": 15, "ghee": 8, "ginger-raw": 3, "garlic-raw": 3 }, servings: [{ name: "bowl", grams: 179 }] },
    { slug: "aloo-gobi", name: "Aloo gobi", aliases: ["aloo gobi"], kind: "composite", sourceLabel: "FitMe IN — aloo gobi", recipe: { "potato-boiled": 80, "cauliflower-raw": 70, "onion-red": 15, "tomato-raw": 10, "coconut-oil": 10 }, servings: [{ name: "bowl", grams: 185 }] },
    { slug: "lassi-sweet", name: "Sweet lassi", aliases: ["lassi"], kind: "composite", sourceLabel: "FitMe IN — sweet lassi", recipe: { "greek-yogurt": 120, "milk-whole": 100, "sugar-white": 15 }, servings: [{ name: "glass", grams: 235 }] },
    { slug: "masala-chai", name: "Masala chai", aliases: ["masala chai", "chai"], kind: "composite", sourceLabel: "FitMe IN — masala chai", recipe: { "black-tea-brewed": 150, "milk-whole": 60, "sugar-white": 8, "ginger-raw": 3 }, servings: [{ name: "cup", grams: 221 }] },
    { slug: "upma", name: "Upma", aliases: ["upma", "rava upma"], kind: "composite", sourceLabel: "FitMe IN — upma", recipe: { "semolina-dry": 50, "onion-red": 20, "carrot-raw": 15, "coconut-oil": 10 }, servings: [{ name: "bowl", grams: 95 }] },
    { slug: "chole-bhature", name: "Chole bhature", aliases: ["chole bhature"], kind: "composite", sourceLabel: "FitMe IN — chole bhature", recipe: { "chickpeas-cooked": 120, "tomato-raw": 25, "onion-red": 15, "wheat-flour": 80, "coconut-oil": 20, "ghee": 8 }, servings: [{ name: "plate", grams: 268 }] },
    { slug: "jalebi", name: "Jalebi", aliases: ["jalebi"], kind: "composite", sourceLabel: "FitMe IN — jalebi", recipe: { "wheat-flour": 25, "sugar-white": 20, "coconut-oil": 15 }, servings: [{ name: "serving", grams: 60 }] },
    { slug: "gulab-jamun", name: "Gulab jamun (2)", aliases: ["gulab jamun"], kind: "composite", sourceLabel: "FitMe IN — gulab jamun", recipe: { "wheat-flour": 20, "milk-whole": 25, "sugar-white": 25, "ghee": 10 }, servings: [{ name: "2 pieces", grams: 80 }] },
  ],
};

const eu = {
  locale: "eu",
  foods: [
    { slug: "pasta-marinara", name: "Pasta marinara", aliases: ["pasta", "spaghetti marinara"], kind: "composite", sourceLabel: "FitMe EU — pasta marinara", recipe: { "pasta-cooked": 200, "tomato-raw": 40, "olive-oil": 10, "garlic-raw": 3 }, servings: [{ name: "bowl", grams: 253 }] },
    { slug: "spaghetti-bolognese", name: "Spaghetti bolognese", aliases: ["bolognese"], kind: "composite", sourceLabel: "FitMe EU — bolognese", recipe: { "pasta-cooked": 180, "ground-beef-cooked": 70, "tomato-raw": 35, "onion-red": 15, "olive-oil": 8, "garlic-raw": 3 }, servings: [{ name: "plate", grams: 311 }] },
    { slug: "margherita-pizza", name: "Margherita pizza (slice)", aliases: ["margherita"], kind: "composite", sourceLabel: "FitMe EU — margherita slice", recipe: { "wheat-flour": 50, "mozzarella-cheese": 40, "tomato-raw": 25, "olive-oil": 8 }, servings: [{ name: "slice", grams: 123 }] },
    { slug: "croissant-pastry", name: "Croissant", aliases: ["croissant"], kind: "simple", sourceLabel: "FitMe EU — croissant", recipe: { "croissant": 60 }, servings: [{ name: "piece", grams: 60 }] },
    { slug: "greek-salad", name: "Greek salad", aliases: ["greek salad"], kind: "composite", sourceLabel: "FitMe EU — greek salad", recipe: { "tomato-raw": 80, "lettuce-raw": 60, "feta-cheese": 40, "olive-oil": 15, "onion-red": 15 }, servings: [{ name: "bowl", grams: 210 }] },
    { slug: "fish-and-chips", name: "Fish and chips", aliases: ["fish and chips"], kind: "composite", sourceLabel: "FitMe EU — fish and chips", recipe: { "fish-white-cooked": 120, "potato-boiled": 150, "wheat-flour": 30, "coconut-oil": 25 }, servings: [{ name: "plate", grams: 325 }] },
    { slug: "hummus-pita", name: "Hummus with pita", aliases: ["hummus"], kind: "composite", sourceLabel: "FitMe EU — hummus pita", recipe: { "chickpeas-cooked": 80, "olive-oil": 15, "pita-bread": 70, "garlic-raw": 3, "lime-juice": 5 }, servings: [{ name: "serving", grams: 173 }] },
    { slug: "bratwurst", name: "Bratwurst plate", aliases: ["bratwurst", "sausage"], kind: "composite", sourceLabel: "FitMe EU — bratwurst", recipe: { "sausage-pork-cooked": 100, "cabbage-raw": 60, "potato-boiled": 40 }, servings: [{ name: "plate", grams: 200 }] },
    { slug: "risotto", name: "Mushroom risotto", aliases: ["risotto"], kind: "composite", sourceLabel: "FitMe EU — risotto", recipe: { "rice-white-cooked": 180, "butter-salted": 12, "onion-red": 15, "milk-whole": 30, "olive-oil": 8 }, servings: [{ name: "bowl", grams: 245 }] },
    { slug: "caprese-salad", name: "Caprese salad", aliases: ["caprese"], kind: "composite", sourceLabel: "FitMe EU — caprese", recipe: { "tomato-raw": 80, "mozzarella-cheese": 60, "olive-oil": 10 }, servings: [{ name: "bowl", grams: 150 }] },
    { slug: "falafel-wrap", name: "Falafel wrap", aliases: ["falafel"], kind: "composite", sourceLabel: "FitMe EU — falafel wrap", recipe: { "chickpea-flour": 40, "pita-bread": 70, "lettuce-raw": 30, "tomato-raw": 25, "onion-red": 15, "coconut-oil": 15 }, servings: [{ name: "wrap", grams: 195 }] },
    { slug: "quiche-slice", name: "Quiche slice", aliases: ["quiche"], kind: "composite", sourceLabel: "FitMe EU — quiche", recipe: { "egg-whole": 50, "milk-whole": 30, "cheddar-cheese": 25, "wheat-flour": 20, "butter-salted": 10, "onion-red": 10 }, servings: [{ name: "slice", grams: 145 }] },
    { slug: "full-english", name: "Full English breakfast", aliases: ["full english"], kind: "composite", sourceLabel: "FitMe EU — full english", recipe: { "egg-whole": 100, "bacon-cooked": 40, "sausage-pork-cooked": 60, "tomato-raw": 40, "bread-white": 60, "butter-salted": 10, "spinach-cooked": 30 }, servings: [{ name: "plate", grams: 340 }] },
    { slug: "paella", name: "Paella", aliases: ["paella"], kind: "composite", sourceLabel: "FitMe EU — paella", recipe: { "rice-white-cooked": 200, "chicken-cooked": 60, "tomato-raw": 25, "onion-red": 15, "olive-oil": 12, "garlic-raw": 3 }, servings: [{ name: "plate", grams: 315 }] },
    { slug: "schnitzel", name: "Chicken schnitzel", aliases: ["schnitzel"], kind: "composite", sourceLabel: "FitMe EU — schnitzel", recipe: { "chicken-cooked": 120, "wheat-flour": 30, "egg-whole": 25, "coconut-oil": 15 }, servings: [{ name: "serving", grams: 190 }] },
    { slug: "minestrone", name: "Minestrone soup", aliases: ["minestrone"], kind: "composite", sourceLabel: "FitMe EU — minestrone", recipe: { "tomato-raw": 60, "carrot-raw": 30, "potato-boiled": 40, "pasta-cooked": 40, "onion-red": 15, "olive-oil": 8, "garlic-raw": 3 }, servings: [{ name: "bowl", grams: 196 }] },
    { slug: "espresso", name: "Espresso", aliases: ["espresso"], kind: "simple", sourceLabel: "FitMe EU — espresso", recipe: { "black-tea-brewed": 30 }, servings: [{ name: "cup", grams: 30 }] },
    { slug: "crepe", name: "Crepe", aliases: ["crepe"], kind: "composite", sourceLabel: "FitMe EU — crepe", recipe: { "wheat-flour": 35, "egg-whole": 25, "milk-whole": 40, "butter-salted": 5, "sugar-white": 5 }, servings: [{ name: "crepe", grams: 110 }] },
    { slug: "moussaka", name: "Moussaka", aliases: ["moussaka"], kind: "composite", sourceLabel: "FitMe EU — moussaka", recipe: { "ground-beef-cooked": 70, "potato-boiled": 80, "tomato-raw": 40, "onion-red": 20, "egg-whole": 25, "milk-whole": 30, "olive-oil": 10 }, servings: [{ name: "serving", grams: 275 }] },
    { slug: "rye-bread-slice", name: "Rye bread slice", aliases: ["rye bread"], kind: "simple", sourceLabel: "FitMe EU — rye bread", recipe: { "bread-white": 35 }, servings: [{ name: "slice", grams: 35 }] },
  ],
};

fs.writeFileSync(path.join(dir, "foods.us.json"), JSON.stringify(us, null, 2));
fs.writeFileSync(path.join(dir, "foods.in.json"), JSON.stringify(ind, null, 2));
fs.writeFileSync(path.join(dir, "foods.eu.json"), JSON.stringify(eu, null, 2));
console.log("wrote regional shards", us.foods.length, ind.foods.length, eu.foods.length);
