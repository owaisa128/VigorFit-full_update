const test = require('node:test');
const assert = require('node:assert/strict');
const lookupFoodNutrition = require('../services/foodNutritionService');

test('lookupFoodNutrition returns the closest matching food with usable calorie data', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(options.headers['User-Agent'], 'VigorFit/1.0 nutrition lookup');
    if (url.hostname === 'api.nal.usda.gov') {
      return { ok: true, json: async () => ({ foods: [] }) };
    }
    assert.match(url.toString(), /search_terms=grilled\+chicken/);
    return {
      ok: true,
      json: async () => ({
        products: [
          {
            product_name: 'Chicken Soup',
            nutriments: { 'energy-kcal_100g': 60 },
            serving_quantity: '250',
          },
          {
            product_name: 'Grilled Chicken',
            nutriments: {
              'energy-kcal_100g': 165,
              'energy-kcal_serving': 230,
              proteins_100g: 31,
              proteins_serving: 43.4,
              carbohydrates_100g: 0,
              carbohydrates_serving: 0,
              fat_100g: 3.6,
              fat_serving: 5,
            },
            serving_quantity: '140',
          },
        ],
      }),
    };
  };

  try {
    assert.deepEqual(await lookupFoodNutrition('grilled chicken'), {
      foodName: 'Grilled Chicken',
      caloriesPer100g: 165,
      caloriesPerServing: 230,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      proteinPerServing: 43.4,
      carbsPerServing: 0,
      fatPerServing: 5,
      servingGrams: 140,
      source: 'Open Food Facts',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('lookupFoodNutrition prefers a matching USDA food result', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.equal(url.hostname, 'api.nal.usda.gov');
    assert.equal(url.searchParams.get('query'), 'grilled chicken');
    assert.equal(url.searchParams.get('pageSize'), '20');
    return {
      ok: true,
      json: async () => ({
        foods: [
          {
            description: 'Chicken, breast, grilled',
            foodNutrients: [
              { nutrientNumber: '208', value: 165 },
              { nutrientNumber: '203', value: 31 },
              { nutrientNumber: '205', value: 0 },
              { nutrientNumber: '204', value: 3.6 },
            ],
            foodPortions: [{ gramWeight: 120 }],
          },
        ],
      }),
    };
  };

  try {
    assert.deepEqual(await lookupFoodNutrition('grilled chicken'), {
      foodName: 'Chicken, breast, grilled',
      caloriesPer100g: 165,
      caloriesPerServing: 198,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      proteinPerServing: 37.2,
      carbsPerServing: 0,
      fatPerServing: 4.32,
      servingGrams: 120,
      source: 'USDA FoodData Central',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('lookupFoodNutrition ranks common raw foods above longer preparation variants', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      foods: [
        {
          description: 'BANANA',
          dataType: 'Branded',
          foodNutrients: [{ nutrientNumber: '208', value: 312 }],
        },
        {
          description: 'Bananas, dehydrated, or banana powder',
          dataType: 'SR Legacy',
          foodNutrients: [{ nutrientNumber: '208', value: 346 }],
        },
        {
          description: 'Banana, baked',
          dataType: 'Survey (FNDDS)',
          foodNutrients: [{ nutrientNumber: '208', value: 161 }],
        },
        {
          description: 'Bananas, raw',
          dataType: 'SR Legacy',
          foodNutrients: [{ nutrientNumber: '208', value: 89 }],
        },
      ],
    }),
  });

  try {
    const nutrition = await lookupFoodNutrition('banana');
    assert.equal(nutrition.foodName, 'Bananas, raw');
    assert.equal(nutrition.caloriesPer100g, 89);
  } finally {
    global.fetch = originalFetch;
  }
});

test('lookupFoodNutrition converts branded calories from serving to gram basis', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      foods: [
        {
          description: 'Chocolate snack bars',
          dataType: 'Branded',
          servingSize: 42,
          servingSizeUnit: 'g',
          foodNutrients: [
            { nutrientNumber: '208', value: 210 },
            { nutrientNumber: '203', value: 4 },
            { nutrientNumber: '205', value: 24 },
            { nutrientNumber: '204', value: 11 },
          ],
        },
      ],
    }),
  });

  try {
    assert.deepEqual(await lookupFoodNutrition('chocolate snack bars'), {
      foodName: 'Chocolate snack bars',
      caloriesPer100g: 500,
      caloriesPerServing: 210,
      proteinPer100g: 9.523809523809524,
      carbsPer100g: 57.142857142857146,
      fatPer100g: 26.19047619047619,
      proteinPerServing: 4,
      carbsPerServing: 24,
      fatPerServing: 11,
      servingGrams: 42,
      source: 'USDA FoodData Central',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('lookupFoodNutrition returns null when no relevant foods include calories', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.hostname === 'api.nal.usda.gov') {
      return { ok: true, json: async () => ({ foods: [] }) };
    }
    return {
      ok: true,
      json: async () => ({
        products: [
          { product_name: 'Orange juice', nutriments: { 'energy-kcal_100g': 45 } },
          { product_name: 'Grilled chicken', nutriments: {} },
        ],
      }),
    };
  };

  try {
    assert.equal(await lookupFoodNutrition('grilled chicken'), null);
  } finally {
    global.fetch = originalFetch;
  }
});
