const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const getTokens = (value) => normalize(value)
  .split(' ')
  .filter(Boolean)
  .map((token) => token.length > 4 && token.endsWith('s') && !token.endsWith('ss')
    ? token.slice(0, -1)
    : token);

const getCalories = (product) => {
  const value = Number(product.nutriments?.['energy-kcal_100g']);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const getOpenFoodFactsNutrient = (nutriments, name) => {
  const per100g = Number(nutriments?.[`${name}_100g`]);
  const perServing = Number(nutriments?.[`${name}_serving`]);

  return {
    per100g: Number.isFinite(per100g) ? per100g : null,
    perServing: Number.isFinite(perServing) ? perServing : null,
  };
};

const getMatchScore = (query, productName) => {
  const queryTokens = getTokens(query);
  const nameTokens = getTokens(productName || '');

  if (!nameTokens.length) return 0;
  if (nameTokens.length === queryTokens.length
    && nameTokens.every((token, index) => token === queryTokens[index])) return 1000;

  const firstSequenceMatch = nameTokens.findIndex((_, start) =>
    queryTokens.every((token, offset) => nameTokens[start + offset] === token)
  );
  if (firstSequenceMatch === 0) return 100 - (nameTokens.length - queryTokens.length);
  if (firstSequenceMatch > 0) return 75 - (nameTokens.length - queryTokens.length);

  const matchedTokens = queryTokens.filter((token) => nameTokens.includes(token)).length;
  return queryTokens.length ? (matchedTokens / queryTokens.length) * 50 : 0;
};

const fetchJson = async (url, userAgent) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Food database returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const lookupUSDA = async (foodName) => {
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('query', foodName);
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('api_key', process.env.USDA_FOODDATA_API_KEY || 'DEMO_KEY');

  const data = await fetchJson(url, 'VigorFit/1.0 nutrition lookup');
  const rawQuery = getTokens(foodName).includes('raw');
  const matches = (Array.isArray(data.foods) ? data.foods : [])
    .map((food) => {
      const getUSDAValue = (numbers) => Number(food.foodNutrients?.find(
        (nutrient) => numbers.includes(nutrient.nutrientNumber)
          || numbers.includes(String(nutrient.nutrientId))
      )?.value);
      const energy = getUSDAValue(['208', '1008']);
      const protein = getUSDAValue(['203', '1003']);
      const carbs = getUSDAValue(['205', '1005']);
      const fat = getUSDAValue(['204', '1004']);
      const isBranded = food.dataType === 'Branded';
      const brandedServingGrams = Number(food.servingSize);
      const servingGrams = isBranded
        ? (/^g(rams?)?$/i.test(food.servingSizeUnit || '') && brandedServingGrams > 0
          ? brandedServingGrams
          : null)
        : Number(food.foodPortions?.find((portion) => Number(portion.gramWeight) > 0)?.gramWeight) || null;

      return {
        foodName: food.description?.trim(),
        caloriesPer100g: isBranded && servingGrams
          ? (energy * 100) / servingGrams
          : isBranded ? null : energy,
        caloriesPerServing: isBranded
          ? energy
          : servingGrams ? (energy * servingGrams) / 100 : null,
        proteinPer100g: isBranded && servingGrams ? (protein * 100) / servingGrams : protein,
        carbsPer100g: isBranded && servingGrams ? (carbs * 100) / servingGrams : carbs,
        fatPer100g: isBranded && servingGrams ? (fat * 100) / servingGrams : fat,
        proteinPerServing: isBranded
          ? protein
          : servingGrams ? (protein * servingGrams) / 100 : null,
        carbsPerServing: isBranded
          ? carbs
          : servingGrams ? (carbs * servingGrams) / 100 : null,
        fatPerServing: isBranded
          ? fat
          : servingGrams ? (fat * servingGrams) / 100 : null,
        servingGrams,
        matchScore: getMatchScore(foodName, food.description),
        isBranded,
        source: 'USDA FoodData Central',
      };
    })
    .filter((food) => food.foodName && food.caloriesPer100g > 0 && food.matchScore > 0)
    .sort((first, second) => Number(first.isBranded) - Number(second.isBranded)
      || second.matchScore - first.matchScore
      || (rawQuery ? 0 : Number(getTokens(second.foodName).includes('raw'))
        - Number(getTokens(first.foodName).includes('raw'))));

  if (!matches.length) return null;

  const { matchScore, isBranded, ...match } = matches[0];
  return match;
};

const lookupOpenFoodFacts = async (foodName) => {
  const url = new URL(OPEN_FOOD_FACTS_SEARCH_URL);
  url.searchParams.set('search_terms', foodName);
  url.searchParams.set('fields', 'product_name,nutriments,serving_quantity');
  url.searchParams.set('page_size', '10');

  const data = await fetchJson(url, 'VigorFit/1.0 nutrition lookup');
  const matches = (Array.isArray(data.products) ? data.products : [])
      .map((product) => {
        const nutrients = product.nutriments || {};
        const protein = getOpenFoodFactsNutrient(nutrients, 'proteins');
        const carbs = getOpenFoodFactsNutrient(nutrients, 'carbohydrates');
        const fat = getOpenFoodFactsNutrient(nutrients, 'fat');

        return {
        foodName: product.product_name?.trim(),
        caloriesPer100g: getCalories(product),
        caloriesPerServing: Number(nutrients['energy-kcal_serving']),
        proteinPer100g: protein.per100g,
        carbsPer100g: carbs.per100g,
        fatPer100g: fat.per100g,
        proteinPerServing: protein.perServing,
        carbsPerServing: carbs.perServing,
        fatPerServing: fat.perServing,
        servingGrams: Number(product.serving_quantity),
        matchScore: getMatchScore(foodName, product.product_name),
        source: 'Open Food Facts',
      };
      })
      .filter((product) => product.foodName && product.caloriesPer100g && product.matchScore > 0)
      .sort((first, second) => second.matchScore - first.matchScore);

  if (!matches.length) return null;

  const { matchScore, ...match } = matches[0];
  return {
    ...match,
    caloriesPerServing: Number.isFinite(match.caloriesPerServing) && match.caloriesPerServing > 0
      ? match.caloriesPerServing
      : null,
    proteinPerServing: Number.isFinite(match.proteinPerServing) ? match.proteinPerServing : null,
    carbsPerServing: Number.isFinite(match.carbsPerServing) ? match.carbsPerServing : null,
    fatPerServing: Number.isFinite(match.fatPerServing) ? match.fatPerServing : null,
    servingGrams: Number.isFinite(match.servingGrams) && match.servingGrams > 0
      ? match.servingGrams
      : null,
  };
};

const lookupFoodNutrition = async (foodName) => {
  let primaryError;
  try {
    const match = await lookupUSDA(foodName);
    if (match) return match;
  } catch (error) {
    primaryError = error;
  }

  try {
    const match = await lookupOpenFoodFacts(foodName);
    if (match) return match;
    if (primaryError) throw primaryError;
    return null;
  } catch (fallbackError) {
    if (primaryError) {
      throw new Error(`${primaryError.message}; ${fallbackError.message}`);
    }
    throw fallbackError;
  }
};

module.exports = lookupFoodNutrition;
