/**
 * Feed Mix Calculator
 * 
 * A TypeScript library for balancing animal feed rations by nutrient targets per species.
 * Supports least-cost formulation with ingredient constraints.
 * 
 * @example
 * 
 * import { balanceRation, createIngredientId, type Ingredient } from 'feed-mix';
 * 
 * const corn = {
 *   id: createIngredientId('corn-yellow'),
 *   name: 'Yellow Corn',
 *   costPerUnit: 0.25,
 *   nutrients: { crudeProtein: 8.5, energy: 3350, calcium: 0.02, phosphorus: 0.28 }
 * };
 * 
 */

export type {
  IngredientId,
  SpeciesId,
  NutrientProfile,
  IngredientConstraint,
  Ingredient,
  SpeciesRequirements,
  RationIngredient,
  RationAnalysis,
  ConstraintViolation,
  RationResult,
  OptimizerConfig,
  RationFormulationInput,
} from './types.js';

export type {
  ValidationError,
  ValidationResult,
} from './validation.js';

export {
  balanceRation,
  computeRationNutrients,
} from './calculator.js';

export {
  validateRange,
  createIngredientId,
  calculateMixNutrients,
  getEffectiveIngredientConstraint,
  initializeOptimizerConfig,
  validateFormulationInput,
  ensureDataDirectory,
  loadDataFile,
  saveDataFile,
} from './utils.js';

export {
  validateIngredient,
  validateIngredients,
  validateNutrientProfile,
  validateIngredientConstraint,
  validateFormulationRequest,
} from './validation.js';

export { predefinedIngredients, loadCustomIngredients, saveCustomIngredients } from './ingredients.js';
