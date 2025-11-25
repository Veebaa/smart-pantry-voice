type StorageCategory = 'fridge' | 'freezer' | 'cupboard' | 'pantry_staples';

interface ClassificationResult {
  category: StorageCategory | null;
  isAmbiguous: boolean;
  possibleCategories?: StorageCategory[];
  reason: 'dictionary' | 'keyword' | 'ambiguous' | 'unknown';
}

const MULTI_WORD_ITEMS: Record<string, StorageCategory> = {
  'ice cream': 'freezer',
  'ice-cream': 'freezer',
  'icecream': 'freezer',
  'corn flakes': 'cupboard',
  'cornflakes': 'cupboard',
  'frozen peas': 'freezer',
  'frozen chips': 'freezer',
  'frozen vegetables': 'freezer',
  'frozen berries': 'freezer',
  'frozen pizza': 'freezer',
  'frozen fish': 'freezer',
  'fish fingers': 'freezer',
  'fish sticks': 'freezer',
  'ice lollies': 'freezer',
  'ice cubes': 'freezer',
  'frozen prawns': 'freezer',
  'frozen shrimp': 'freezer',
  'frozen meat': 'freezer',
  'frozen bread': 'freezer',
  'baked beans': 'cupboard',
  'tinned tomatoes': 'cupboard',
  'canned tomatoes': 'cupboard',
  'canned soup': 'cupboard',
  'tinned soup': 'cupboard',
  'tinned tuna': 'cupboard',
  'canned tuna': 'cupboard',
  'canned beans': 'cupboard',
  'tinned beans': 'cupboard',
  'tinned peas': 'cupboard',
  'canned peas': 'cupboard',
  'tinned corn': 'cupboard',
  'canned corn': 'cupboard',
  'tinned fruit': 'cupboard',
  'canned fruit': 'cupboard',
  'canned chickpeas': 'cupboard',
  'tinned chickpeas': 'cupboard',
  'coconut milk': 'cupboard',
  'long life milk': 'cupboard',
  'uht milk': 'cupboard',
  'peanut butter': 'cupboard',
  'olive oil': 'pantry_staples',
  'vegetable oil': 'pantry_staples',
  'soy sauce': 'pantry_staples',
  'stock cubes': 'pantry_staples',
  'dried beans': 'pantry_staples',
  'dried pasta': 'pantry_staples',
  'baking powder': 'pantry_staples',
  'baking soda': 'pantry_staples',
  'corn starch': 'pantry_staples',
  'corn flour': 'pantry_staples',
  'dried herbs': 'pantry_staples',
  'fresh fish': 'fridge',
  'fresh salmon': 'fridge',
  'fresh prawns': 'fridge',
  'fresh meat': 'fridge',
  'fresh chicken': 'fridge',
  'fresh vegetables': 'fridge',
  'fresh berries': 'fridge',
  'fresh bread': 'cupboard',
  'potato chips': 'cupboard',
  'tortilla chips': 'cupboard',
};

const SINGLE_WORD_ITEMS: Record<string, StorageCategory> = {
  cheese: 'fridge',
  milk: 'fridge',
  yogurt: 'fridge',
  yoghurt: 'fridge',
  butter: 'fridge',
  eggs: 'fridge',
  ham: 'fridge',
  bacon: 'fridge',
  cream: 'fridge',
  chicken: 'fridge',
  beef: 'fridge',
  mince: 'fridge',
  pork: 'fridge',
  lamb: 'fridge',
  sausages: 'fridge',
  sausage: 'fridge',
  lettuce: 'fridge',
  spinach: 'fridge',
  kale: 'fridge',
  cucumber: 'fridge',
  celery: 'fridge',
  carrots: 'fridge',
  carrot: 'fridge',
  hummus: 'fridge',
  juice: 'fridge',
  deli: 'fridge',
  salami: 'fridge',
  prosciutto: 'fridge',
  mayonnaise: 'fridge',
  mayo: 'fridge',
  ketchup: 'fridge',
  mustard: 'fridge',
  jam: 'fridge',
  marmalade: 'fridge',
  
  cereal: 'cupboard',
  crackers: 'cupboard',
  biscuits: 'cupboard',
  cookies: 'cupboard',
  crisps: 'cupboard',
  nuts: 'cupboard',
  honey: 'cupboard',
  chocolate: 'cupboard',
  coffee: 'cupboard',
  tea: 'cupboard',
  peanuts: 'cupboard',
  peanut: 'cupboard',
  onion: 'cupboard',
  onions: 'cupboard',
  garlic: 'cupboard',
  potato: 'cupboard',
  potatoes: 'cupboard',
  tomato: 'cupboard',
  tomatoes: 'cupboard',
  apple: 'cupboard',
  apples: 'cupboard',
  banana: 'cupboard',
  bananas: 'cupboard',
  orange: 'cupboard',
  oranges: 'cupboard',
  lemon: 'cupboard',
  lemons: 'cupboard',
  lime: 'cupboard',
  limes: 'cupboard',
  avocado: 'cupboard',
  avocados: 'cupboard',
  
  pasta: 'pantry_staples',
  spaghetti: 'pantry_staples',
  penne: 'pantry_staples',
  fusilli: 'pantry_staples',
  macaroni: 'pantry_staples',
  noodles: 'pantry_staples',
  rice: 'pantry_staples',
  oats: 'pantry_staples',
  porridge: 'pantry_staples',
  flour: 'pantry_staples',
  sugar: 'pantry_staples',
  salt: 'pantry_staples',
  pepper: 'pantry_staples',
  oil: 'pantry_staples',
  vinegar: 'pantry_staples',
  stock: 'pantry_staples',
  lentils: 'pantry_staples',
  couscous: 'pantry_staples',
  quinoa: 'pantry_staples',
  yeast: 'pantry_staples',
  cornflour: 'pantry_staples',
  breadcrumbs: 'pantry_staples',
  spices: 'pantry_staples',
  cinnamon: 'pantry_staples',
  cumin: 'pantry_staples',
  paprika: 'pantry_staples',
  oregano: 'pantry_staples',
  basil: 'pantry_staples',
  thyme: 'pantry_staples',
};

const AMBIGUOUS_BASE_ITEMS: Record<string, StorageCategory[]> = {
  fish: ['fridge', 'freezer'],
  salmon: ['fridge', 'freezer'],
  prawns: ['fridge', 'freezer'],
  shrimp: ['fridge', 'freezer'],
  peas: ['fridge', 'freezer', 'cupboard'],
  corn: ['fridge', 'freezer', 'cupboard'],
  bread: ['cupboard', 'freezer'],
  berries: ['fridge', 'freezer'],
  strawberries: ['fridge', 'freezer'],
  blueberries: ['fridge', 'freezer'],
  raspberries: ['fridge', 'freezer'],
  pizza: ['fridge', 'freezer'],
  vegetables: ['fridge', 'freezer', 'cupboard'],
  meat: ['fridge', 'freezer'],
  beans: ['cupboard', 'pantry_staples'],
  soup: ['fridge', 'cupboard'],
  pie: ['fridge', 'freezer'],
  pastry: ['fridge', 'freezer'],
  dough: ['fridge', 'freezer'],
  mushrooms: ['fridge', 'cupboard'],
  herbs: ['fridge', 'pantry_staples'],
  tofu: ['fridge', 'freezer'],
  chips: ['cupboard', 'freezer'],
};

const CATEGORY_KEYWORDS: { keywords: string[], category: StorageCategory }[] = [
  { keywords: ['frozen', 'freeze', 'freezing'], category: 'freezer' },
  { keywords: ['fresh', 'raw', 'chilled', 'refrigerated'], category: 'fridge' },
  { keywords: ['tinned', 'canned', 'tin', 'can'], category: 'cupboard' },
  { keywords: ['dried', 'dry', 'dehydrated'], category: 'pantry_staples' },
  { keywords: ['long-life', 'longlife', 'long life', 'uht', 'shelf-stable'], category: 'cupboard' },
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(' ').filter(t => t.length > 0);
}

function containsExactPhrase(text: string, phrase: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);
  
  if (normalizedText === normalizedPhrase) return true;
  
  const regex = new RegExp(`(^|\\s)${normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`, 'i');
  return regex.test(normalizedText);
}

function containsKeywordToken(tokens: string[], keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (keyword.includes(' ') || keyword.includes('-')) {
      continue;
    }
    if (tokens.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function containsKeywordPhrase(text: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (keyword.includes(' ') || keyword.includes('-')) {
      if (containsExactPhrase(text, keyword)) {
        return true;
      }
    }
  }
  return false;
}

export function classifyItem(itemName: string): ClassificationResult {
  const normalizedName = normalizeText(itemName);
  const tokens = tokenize(itemName);
  
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (containsKeywordPhrase(normalizedName, keywords)) {
      return { category, isAmbiguous: false, reason: 'keyword' };
    }
    if (containsKeywordToken(tokens, keywords)) {
      return { category, isAmbiguous: false, reason: 'keyword' };
    }
  }
  
  for (const [phrase, category] of Object.entries(MULTI_WORD_ITEMS)) {
    if (containsExactPhrase(normalizedName, phrase)) {
      return { category, isAmbiguous: false, reason: 'dictionary' };
    }
  }
  
  if (SINGLE_WORD_ITEMS[normalizedName]) {
    return {
      category: SINGLE_WORD_ITEMS[normalizedName],
      isAmbiguous: false,
      reason: 'dictionary'
    };
  }
  
  for (const token of tokens) {
    if (SINGLE_WORD_ITEMS[token]) {
      return {
        category: SINGLE_WORD_ITEMS[token],
        isAmbiguous: false,
        reason: 'dictionary'
      };
    }
  }
  
  if (AMBIGUOUS_BASE_ITEMS[normalizedName]) {
    return {
      category: null,
      isAmbiguous: true,
      possibleCategories: AMBIGUOUS_BASE_ITEMS[normalizedName],
      reason: 'ambiguous'
    };
  }
  
  for (const token of tokens) {
    if (AMBIGUOUS_BASE_ITEMS[token]) {
      return {
        category: null,
        isAmbiguous: true,
        possibleCategories: AMBIGUOUS_BASE_ITEMS[token],
        reason: 'ambiguous'
      };
    }
  }
  
  return {
    category: null,
    isAmbiguous: false,
    reason: 'unknown'
  };
}

export function isAmbiguous(itemName: string): boolean {
  return classifyItem(itemName).isAmbiguous;
}

export function formatClarificationQuestion(itemName: string, possibleCategories: StorageCategory[]): string {
  const categoryNames: Record<StorageCategory, string> = {
    fridge: 'fridge',
    freezer: 'freezer',
    cupboard: 'cupboard',
    pantry_staples: 'pantry staples'
  };
  
  const options = possibleCategories.map(cat => categoryNames[cat]);
  
  if (options.length === 2) {
    return `You said ${itemName}. Should that go in the ${options[0]} or ${options[1]}?`;
  }
  
  const lastOption = options.pop();
  return `You said ${itemName}. Should that go in the ${options.join(', ')}, or ${lastOption}?`;
}

export function getClassificationForAI(): string {
  return `
SMART ITEM CATEGORIZATION RULES:
You must automatically classify items into the correct storage category WITHOUT asking the user, except when genuinely ambiguous.

PRIORITY ORDER FOR CLASSIFICATION:

STEP 1 - KEYWORD DETECTION (HIGHEST PRIORITY):
If the item name contains ANY of these keywords, classify IMMEDIATELY - do NOT check ambiguity:
- "frozen", "freeze" → freezer
- "fresh", "raw", "chilled", "refrigerated" → fridge
- "tinned", "canned", "tin", "can" → cupboard
- "dried", "dry", "dehydrated" → pantry_staples
- "long-life", "longlife", "uht", "shelf-stable" → cupboard

CRITICAL EXAMPLES - these should NEVER trigger an "ask" action:
- "frozen fish" → freezer (keyword "frozen" overrides any ambiguity)
- "tinned peas" → cupboard (keyword "tinned" overrides any ambiguity)
- "fresh salmon" → fridge (keyword "fresh" overrides any ambiguity)
- "dried beans" → pantry_staples (keyword "dried" overrides any ambiguity)
- "canned soup" → cupboard (keyword "canned" overrides any ambiguity)
- "tinned beans" → cupboard (keyword "tinned" overrides any ambiguity)

STEP 2 - KNOWN MULTI-WORD ITEMS (auto-classify without asking):
- "ice cream" → freezer
- "fish fingers" → freezer
- "baked beans" → cupboard
- "potato chips" → cupboard (crisps)
- "peanut butter" → cupboard
- "olive oil" → pantry_staples

STEP 3 - KNOWN SINGLE ITEMS (auto-classify without asking):
Dairy/Cold → fridge: cheese, milk, yogurt, butter, eggs, cream, bacon, ham, chicken, beef, lamb
Pantry staples → pantry_staples: pasta, spaghetti, rice, flour, sugar, salt, oats, noodles, oil, vinegar, spices, lentils
Shelf-stable → cupboard: cereal, honey, crackers, biscuits, onions, potatoes, bananas, apples, tea, coffee

STEP 4 - AMBIGUOUS ITEMS (ONLY ask if NO keyword modifiers present):
These items are ambiguous ONLY when they appear alone without keywords:
- "fish" alone → ASK: fridge or freezer?
- "peas" alone → ASK: fridge, freezer, or cupboard?
- "bread" alone → ASK: cupboard or freezer?
- "berries" alone → ASK: fridge or freezer?
- "pizza" alone → ASK: fridge or freezer?
- "soup" alone → ASK: fridge or cupboard?
- "chips" alone → ASK: cupboard or freezer? (could be crisps or oven chips)

STEP 5 - UNKNOWN ITEMS:
For items you don't recognize, make a reasonable guess based on similar items. Only ask if truly uncertain.

CRITICAL RULES:
1. NEVER ask for items with category keywords (frozen, tinned, fresh, dried, etc.)
2. ALWAYS check for keywords BEFORE checking if item is ambiguous
3. "frozen fish" = freezer (NOT ambiguous - has keyword)
4. "tinned soup" = cupboard (NOT ambiguous - has keyword)
5. "fish" alone = ambiguous (no keyword)
6. When using action="add_item", ALWAYS include the category field
`;
}
