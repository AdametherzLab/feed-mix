import { describe, it, expect } from 'bun:test';
import {
  validateIngredient,
  validateIngredients,
  validateNutrientProfile,
  validateIngredientConstraint,
  validateFormulationRequest,
} from '../src/validation.js';
import { createIngredientId } from '../src/utils.js';
import type { Ingredient, SpeciesRequirements, RationFormulationInput } from '../src/types.js';

const validCorn: Ingredient = {
  id: createIngredientId('corn'),
  name: 'Yellow Corn',
  costPerUnit: 0.25,
  nutrients: { crudeProtein: 8.5, energy: 3350, calcium: 0.02, phosphorus: 0.28 },
};

const validSoy: Ingredient = {
  id: createIngredientId('soybean-meal'),
  name: 'Soybean Meal',
  costPerUnit: 0.45,
  nutrients: { crudeProtein: 48.0, energy: 2200, calcium: 0.25, phosphorus: 0.65 },
};

const broilerReqs: SpeciesRequirements = {
  speciesId: 'broiler-starter' as any,
  speciesName: 'Broiler Starter',
  minCrudeProtein: 21,
  maxCrudeProtein: 24,
  minEnergy: 3000,
  maxEnergy: 3300,
  minCalcium: 0.9,
  maxCalcium: 1.1,
  minPhosphorus: 0.45,
  maxPhosphorus: 0.55,
};

describe('validateNutrientProfile', () => {
  it('returns no errors for a valid profile', () => {
    const errors = validateNutrientProfile(validCorn.nutrients);
    expect(errors).toHaveLength(0);
  });

  it('rejects null nutrient profile', () => {
    const errors = validateNutrientProfile(null);
    expect(errors.length).toBe(1);
    expect(errors[0].field).toBe('nutrients');
  });

  it('rejects out-of-range crude protein', () => {
    const errors = validateNutrientProfile({ crudeProtein: 150, energy: 100, calcium: 1, phosphorus: 1 });
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.field.includes('crudeProtein'))).toBe(true);
  });

  it('rejects negative energy', () => {
    const errors = validateNutrientProfile({ crudeProtein: 10, energy: -5, calcium: 1, phosphorus: 1 });
    expect(errors.some(e => e.field.includes('energy'))).toBe(true);
  });

  it('rejects NaN values', () => {
    const errors = validateNutrientProfile({ crudeProtein: NaN, energy: 100, calcium: 1, phosphorus: 1 });
    expect(errors.some(e => e.field.includes('crudeProtein'))).toBe(true);
  });
});

describe('validateIngredientConstraint', () => {
  it('returns no errors for valid constraint', () => {
    const errors = validateIngredientConstraint({ minInclusionPercent: 10, maxInclusionPercent: 70 }, 'Corn');
    expect(errors).toHaveLength(0);
  });

  it('allows undefined (optional)', () => {
    const errors = validateIngredientConstraint(undefined, 'Corn');
    expect(errors).toHaveLength(0);
  });

  it('rejects min > max', () => {
    const errors = validateIngredientConstraint({ minInclusionPercent: 80, maxInclusionPercent: 20 }, 'Corn');
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects out-of-range percentages', () => {
    const errors = validateIngredientConstraint({ minInclusionPercent: -5 }, 'Corn');
    expect(errors.some(e => e.field.includes('minInclusionPercent'))).toBe(true);
  });
});

describe('validateIngredient', () => {
  it('accepts a valid ingredient', () => {
    const result = validateIngredient(validCorn);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null input', () => {
    const result = validateIngredient(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
  });

  it('rejects empty id', () => {
    const bad = { ...validCorn, id: '' };
    const result = validateIngredient(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('id'))).toBe(true);
  });

  it('rejects empty name', () => {
    const bad = { ...validCorn, name: '   ' };
    const result = validateIngredient(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('name'))).toBe(true);
  });

  it('rejects negative cost', () => {
    const bad = { ...validCorn, costPerUnit: -1 };
    const result = validateIngredient(bad);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('costPerUnit'))).toBe(true);
  });

  it('rejects invalid nutrient profile', () => {
    const bad = { ...validCorn, nutrients: { crudeProtein: -5, energy: 100, calcium: 1, phosphorus: 1 } };
    const result = validateIngredient(bad);
    expect(result.valid).toBe(false);
  });

  it('validates default constraints when present', () => {
    const bad = { ...validCorn, defaultConstraint: { minInclusionPercent: 110 } };
    const result = validateIngredient(bad);
    expect(result.valid).toBe(false);
  });

  it('includes index in field path when provided', () => {
    const result = validateIngredient(null, 3);
    expect(result.errors[0].field).toContain('[3]');
  });
});

describe('validateIngredients', () => {
  it('accepts a valid ingredient array', () => {
    const result = validateIngredients([validCorn, validSoy]);
    expect(result.valid).toBe(true);
  });

  it('rejects non-array input', () => {
    const result = validateIngredients('not-an-array');
    expect(result.valid).toBe(false);
  });

  it('rejects empty array', () => {
    const result = validateIngredients([]);
    expect(result.valid).toBe(false);
  });

  it('detects duplicate ingredient ids', () => {
    const dup = { ...validCorn };
    const result = validateIngredients([validCorn, dup]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });

  it('aggregates errors across multiple invalid ingredients', () => {
    const bad1 = { id: '', name: 'A', costPerUnit: 0, nutrients: { crudeProtein: 0, energy: 0, calcium: 0, phosphorus: 0 } };
    const bad2 = { id: 'b', name: '', costPerUnit: -1, nutrients: { crudeProtein: 0, energy: 0, calcium: 0, phosphorus: 0 } };
    const result = validateIngredients([bad1, bad2]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateFormulationRequest', () => {
  const validInput: RationFormulationInput = {
    availableIngredients: [validCorn, validSoy],
    requirements: broilerReqs,
  };

  it('accepts a valid formulation input', () => {
    const result = validateFormulationRequest(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null input', () => {
    const result = validateFormulationRequest(null);
    expect(result.valid).toBe(false);
  });

  it('rejects missing requirements', () => {
    const result = validateFormulationRequest({ availableIngredients: [validCorn] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'requirements')).toBe(true);
  });

  it('rejects requirements where max < min', () => {
    const badReqs = { ...broilerReqs, maxCrudeProtein: 10, minCrudeProtein: 30 };
    const result = validateFormulationRequest({ availableIngredients: [validCorn], requirements: badReqs });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('maxCrudeProtein'))).toBe(true);
  });

  it('rejects constraint overrides referencing unknown ingredient ids', () => {
    const result = validateFormulationRequest({
      availableIngredients: [validCorn],
      requirements: broilerReqs,
      ingredientConstraints: { 'unknown-id': { minInclusionPercent: 5 } } as any,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('unknown'))).toBe(true);
  });

  it('validates constraint override values', () => {
    const result = validateFormulationRequest({
      availableIngredients: [validCorn],
      requirements: broilerReqs,
      ingredientConstraints: { [validCorn.id]: { minInclusionPercent: 200 } } as any,
    });
    expect(result.valid).toBe(false);
  });
});
