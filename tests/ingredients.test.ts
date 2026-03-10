import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { 
  predefinedIngredients,
  loadCustomIngredients,
  saveCustomIngredients 
} from '../src/ingredients.js';
import { 
  ensureDataDirectory,
  loadDataFile,
  saveDataFile 
} from '../src/utils.js';
import { validateIngredient } from '../src/validation.js';
import type { Ingredient } from '../src/types.js';

// Mock the file system functions to isolate tests
mock.module('../src/utils.js', () => ({
  ensureDataDirectory: mock(() => Promise.resolve()),
  loadDataFile: mock(() => Promise.resolve([])),
  saveDataFile: mock(() => Promise.resolve())
}));

describe('predefinedIngredients', () => {
  it('should contain valid ingredient definitions', () => {
    for (const ing of predefinedIngredients) {
      const result = validateIngredient(ing);
      expect(result.valid).toBe(true);
    }
  });

  it('should include common feed ingredients', () => {
    const names = predefinedIngredients.map(i => i.name);
    expect(names).toContain('Yellow Corn');
    expect(names).toContain('Soybean Meal (48% CP)');
    expect(names).toContain('Wheat Middlings');
    expect(names).toContain('Limestone');
  });
});

describe('loadCustomIngredients', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (loadDataFile as any).mockClear();
  });

  it('should return empty array when no custom ingredients exist', async () => {
    (loadDataFile as any).mockResolvedValueOnce(null);
    const ingredients = await loadCustomIngredients();
    expect(ingredients).toEqual([]);
  });

  it('should return valid custom ingredients', async () => {
    const validIngredient: Ingredient = {
      id: 'test-id',
      name: 'Test Ingredient',
      costPerUnit: 0.1,
      nutrients: {
        crudeProtein: 10,
        energy: 2500,
        calcium: 0.5,
        phosphorus: 0.3
      }
    };
    (loadDataFile as any).mockResolvedValueOnce([validIngredient]);
    
    const ingredients = await loadCustomIngredients();
    expect(ingredients).toHaveLength(1);
    expect(validateIngredient(ingredients[0]).valid).toBe(true);
  });

  it('should filter invalid custom ingredients and warn', async () => {
    const invalidIngredient = { 
      id: '', 
      name: '', 
      costPerUnit: -1,
      nutrients: { crudeProtein: -5, energy: -100, calcium: 200, phosphorus: -1 }
    };
    (loadDataFile as any).mockResolvedValueOnce([invalidIngredient]);
    
    const ingredients = await loadCustomIngredients();
    expect(ingredients).toEqual([]);
  });
});

describe('saveCustomIngredients', () => {
  it('should save valid ingredients', async () => {
    const validIngredients: Ingredient[] = [{
      id: 'test-valid',
      name: 'Valid Ingredient',
      costPerUnit: 0.3,
      nutrients: {
        crudeProtein: 12,
        energy: 2800,
        calcium: 0.8,
        phosphorus: 0.4
      }
    }];

    await saveCustomIngredients(validIngredients);
    expect(saveDataFile).toHaveBeenCalledWith('custom-ingredients.json', validIngredients);
  });

  it('should throw error when saving invalid ingredients', async () => {
    const invalidIngredients = [{
      id: '',
      name: 'Invalid',
      costPerUnit: -5,
      nutrients: {
        crudeProtein: 150,
        energy: -1000,
        calcium: 200,
        phosphorus: -1
      }
    }];

    try {
      await saveCustomIngredients(invalidIngredients as any);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toInclude('Cannot save invalid ingredients');
    }
  });
});
