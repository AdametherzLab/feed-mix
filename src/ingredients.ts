import { createIngredientId } from './utils.js';
import { ensureDataDirectory, loadDataFile, saveDataFile } from './utils.js';
import { validateIngredients } from './validation.js';
import type { Ingredient } from './types.js';

/**
 * Predefined common feed ingredients with typical nutritional values.
 * These can be used as a starting point for formulations.
 */
export const predefinedIngredients: Ingredient[] = [
  {
    id: createIngredientId('corn-yellow'),
    name: 'Yellow Corn',
    costPerUnit: 0.25,
    nutrients: {
      crudeProtein: 8.5,
      energy: 3350,
      calcium: 0.02,
      phosphorus: 0.28
    },
    defaultConstraint: {
      minInclusionPercent: 0,
      maxInclusionPercent: 70
    }
  },
  {
    id: createIngredientId('soybean-meal-48'),
    name: 'Soybean Meal (48% CP)',
    costPerUnit: 0.45,
    nutrients: {
      crudeProtein: 48.0,
      energy: 2200,
      calcium: 0.25,
      phosphorus: 0.65
    },
    defaultConstraint: {
      minInclusionPercent: 10,
      maxInclusionPercent: 40
    }
  },
  {
    id: createIngredientId('wheat-middlings'),
    name: 'Wheat Middlings',
    costPerUnit: 0.18,
    nutrients: {
      crudeProtein: 16.5,
      energy: 2800,
      calcium: 0.12,
      phosphorus: 0.9
    },
    defaultConstraint: {
      minInclusionPercent: 0,
      maxInclusionPercent: 30
    }
  },
  {
    id: createIngredientId('limestone'),
    name: 'Limestone',
    costPerUnit: 0.05,
    nutrients: {
      crudeProtein: 0,
      energy: 0,
      calcium: 38.0,
      phosphorus: 0.02
    },
    defaultConstraint: {
      minInclusionPercent: 0,
      maxInclusionPercent: 5
    }
  }
];

/**
 * Loads user-defined custom ingredients from the data directory.
 * @returns Array of validated custom ingredients. Returns empty array if invalid or none exist.
 */
export async function loadCustomIngredients(): Promise<Ingredient[]> {
  await ensureDataDirectory();
  const ingredients = await loadDataFile<Ingredient[]>('custom-ingredients.json');
  const validation = validateIngredients(ingredients || []);
  
  if (!validation.valid) {
    console.warn('[feed-mix] Invalid custom ingredients detected:', validation.errors);
    return [];
  }

  return ingredients || [];
}

/**
 * Saves user-defined custom ingredients to the data directory.
 * @param ingredients - Array of ingredients to save. Will be validated before saving.
 * @throws {Error} If any ingredients fail validation.
 */
export async function saveCustomIngredients(ingredients: Ingredient[]): Promise<void> {
  const validation = validateIngredients(ingredients);
  
  if (!validation.valid) {
    throw new Error(`Cannot save invalid ingredients: ${
      validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
    }`);
  }

  await ensureDataDirectory();
  await saveDataFile('custom-ingredients.json', ingredients);
}
