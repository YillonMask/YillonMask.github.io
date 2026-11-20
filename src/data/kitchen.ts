// Dishes and ingredients from Xinrui's dish-teardown project (src/dishes/dish_kungpao.js, dish_noodle.js).
// Names, roles and amounts are translated from his Chinese copy; amounts are his rough home-style estimates.
export type Ingredient = { id: string; zh: string; en: string; tag?: string; amount: string; role: string; swatch: string }
export type Dish = {
  id: string
  dir: string
  zh: string
  en: string
  blurb: string
  rule?: string
  parts: Ingredient[] // bottom of the stack first, same order as the render's anchors
}

export const DISHES: Dish[] = [
  {
    id: 'kungpao',
    dir: 'kp',
    zh: '宫保鸡丁',
    en: 'Kung Pao Chicken',
    blurb: 'Sichuan’s scorched-chili, “lychee” sweet-sour classic: dried chilies and Sichuan pepper bloom in hot oil, the sauce coats tender chicken, and crisp peanuts go in last.',
    parts: [
      { id: 'plate', zh: '白瓷深盘', en: 'Porcelain plate', amount: '⌀ ≈ 28 cm', role: 'vessel', swatch: '#f1f1ec' },
      { id: 'sauce', zh: '宫保酱汁', en: 'Lychee-style sauce', amount: '≈ 50–70 ml', role: 'seasoning core', swatch: '#6e260b' },
      { id: 'chicken', zh: '鸡丁', en: 'Diced chicken', amount: '≈ 250–300 g', role: 'main', swatch: '#a5602c' },
      { id: 'peanut', zh: '花生米', en: 'Fried peanuts', amount: '≈ 50–80 g', role: 'crunch', swatch: '#b8783a' },
      { id: 'chili', zh: '干辣椒段', en: 'Dried chili', amount: '≈ 10–15 pcs · 5–10 g', role: 'scorched aroma', swatch: '#7a1510' },
      { id: 'pepper', zh: '花椒', en: 'Sichuan pepper', amount: '≈ 1 tsp · 2–3 g', role: 'numbing', swatch: '#7a2c1a' },
      { id: 'scallion', zh: '葱段', en: 'Scallion', amount: '≈ 2–3 whites · 50 g', role: 'fragrance', swatch: '#d9d6b4' },
      { id: 'gingergarlic', zh: '姜片 · 蒜片', en: 'Ginger · garlic', amount: '≈ 10 g · 3–4 cloves', role: 'base aromatics', swatch: '#ead9a8' },
    ],
  },
  {
    id: 'noodles',
    dir: 'nd',
    zh: '兰州牛肉面',
    en: 'Lanzhou Beef Noodles',
    blurb: 'One bowl, five colors: clear broth, white radish, red chili oil, green herbs, yellow hand-pulled noodles.',
    rule: '一清 二白 三红 四绿 五黄',
    parts: [
      { id: 'bowl', zh: '大海碗', en: 'Wide bowl', amount: '≈ 1 L', role: 'vessel', swatch: '#f4f3ef' },
      { id: 'broth', zh: '清汤', tag: '一清', en: 'Clear beef broth', amount: '≈ 400–500 ml', role: 'the soul', swatch: '#d6a24f' },
      { id: 'noodles', zh: '手工拉面', tag: '五黄', en: 'Hand-pulled noodles', amount: '≈ 150–250 g', role: 'main', swatch: '#f0cf72' },
      { id: 'radish', zh: '白萝卜片', tag: '二白', en: 'White radish', amount: '≈ 4–6 slices', role: 'sweet, clean', swatch: '#f2efe2' },
      { id: 'beef', zh: '牛肉片', en: 'Beef shank', amount: '≈ 30–50 g', role: 'meat', swatch: '#7a4330' },
      { id: 'chili', zh: '油泼辣子', tag: '三红', en: 'Chili oil', amount: '≈ 1–2 tbsp', role: 'color, heat', swatch: '#c4281c' },
      { id: 'greens', zh: '香菜 · 蒜苗', tag: '四绿', en: 'Cilantro · garlic shoots', amount: '≈ 5–10 g', role: 'aroma', swatch: '#4c9b3a' },
    ],
  },
]
