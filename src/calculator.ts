import type {
  Ingredient,
  IngredientId,
  RationAnalysis,
  RationFormulationInput,
  RationIngredient,
  RationResult,
  ConstraintViolation,
  SpeciesRequirements,
  IngredientConstraint
} from './types.js';

type ConstraintMap = Readonly<Record<IngredientId, IngredientConstraint>>;

/**
 * Resolves the effective ingredient constraints, merging default constraints with any overrides.
 * @param ing - The ingredient definition.
 * @param overrides - Optional map of ingredient ID to specific constraints that override defaults.
 * @returns A complete `Required<IngredientConstraint>` object with `minInclusionPercent` and `maxInclusionPercent` defined.
 */
function getConstraint(ing: Ingredient, overrides?: ConstraintMap): Required<IngredientConstraint> {
  const over = overrides?.[ing.id];
  return {
    minInclusionPercent: over?.minInclusionPercent ?? ing.defaultConstraint?.minInclusionPercent ?? 0,
    maxInclusionPercent: over?.maxInclusionPercent ?? ing.defaultConstraint?.maxInclusionPercent ?? 100
  };
}

/**
 * Calculates the nutritional analysis of a ration given ingredients and their inclusion percentages.
 * @param ingredients - An array of ingredient definitions.
 * @param pcts - An array of inclusion percentages corresponding to each ingredient.
 * @returns The calculated `RationAnalysis`.
 */
function calcAnalysis(ingredients: readonly Ingredient[], pcts: readonly number[]): RationAnalysis {
  return ingredients.reduce<RationAnalysis>((acc, ing, i) => {
    const w = pcts[i] / 100; // Convert percentage to a weight factor
    return {
      crudeProtein: acc.crudeProtein + ing.nutrients.crudeProtein * w,
      energy: acc.energy + ing.nutrients.energy * w,
      calcium: acc.calcium + ing.nutrients.calcium * w,
      phosphorus: acc.phosphorus + ing.nutrients.phosphorus * w
    };
  }, { crudeProtein: 0, energy: 0, calcium: 0, phosphorus: 0 });
}

/**
 * Identifies all constraint violations in a formulated ration against species requirements and ingredient constraints.
 * @param analysis - The nutritional analysis of the formulated ration.
 * @param mix - The list of ingredients and their inclusion percentages in the ration.
 * @param req - The species nutritional requirements.
 * @param ingredients - The full list of available ingredient definitions.
 * @param constraints - Optional map of ingredient ID to specific constraints that override defaults.
 * @returns An array of `ConstraintViolation` objects.
 */
function findViolations(
  analysis: RationAnalysis,
  mix: readonly RationIngredient[],
  req: SpeciesRequirements,
  ingredients: readonly Ingredient[],
  constraints?: ConstraintMap
): readonly ConstraintViolation[] {
  const v: ConstraintViolation[] = [];
  const check = (type: ConstraintViolation['type'], msg: string, actual: number, target: number, id?: IngredientId): void => {
    v.push({ type, message: msg, actualValue: actual, targetValue: target, ingredientId: id });
  };

  // Check nutrient requirements
  if (analysis.crudeProtein < req.minCrudeProtein) check('protein-min', `Protein ${analysis.crudeProtein.toFixed(2)}% below minimum ${req.minCrudeProtein}%`, analysis.crudeProtein, req.minCrudeProtein);
  if (req.maxCrudeProtein !== undefined && analysis.crudeProtein > req.maxCrudeProtein) check('protein-max', `Protein ${analysis.crudeProtein.toFixed(2)}% exceeds maximum ${req.maxCrudeProtein}%`, analysis.crudeProtein, req.maxCrudeProtein);
  if (analysis.energy < req.minEnergy) check('energy-min', `Energy ${analysis.energy.toFixed(0)} kcal/kg below minimum ${req.minEnergy}`, analysis.energy, req.minEnergy);
  if (req.maxEnergy !== undefined && analysis.energy > req.maxEnergy) check('energy-max', `Energy ${analysis.energy.toFixed(0)} kcal/kg exceeds maximum ${req.maxEnergy}`, analysis.energy, req.maxEnergy);
  if (analysis.calcium < req.minCalcium) check('calcium-min', `Calcium ${analysis.calcium.toFixed(2)}% below minimum ${req.minCalcium}%`, analysis.calcium, req.minCalcium);
  if (req.maxCalcium !== undefined && analysis.calcium > req.maxCalcium) check('calcium-max', `Calcium ${analysis.calcium.toFixed(2)}% exceeds maximum ${req.maxCalcium}%`, analysis.calcium, req.maxCalcium);
  if (analysis.phosphorus < req.minPhosphorus) check('phosphorus-min', `Phosphorus ${analysis.phosphorus.toFixed(2)}% below minimum ${req.minPhosphorus}%`, analysis.phosphorus, req.minPhosphorus);
  if (req.maxPhosphorus !== undefined && analysis.phosphorus > req.maxPhosphorus) check('phosphorus-max', `Phosphorus ${analysis.phosphorus.toFixed(2)}% exceeds maximum ${req.maxPhosphorus}%`, analysis.phosphorus, req.maxPhosphorus);

  // Check ingredient inclusion constraints
  for (const item of mix) {
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) {
      // This should ideally not happen if mix is derived from availableIngredients
      console.warn(`Ingredient with ID ${item.ingredientId} not found in available ingredients.`);
      continue;
    }
    const c = getConstraint(ing, constraints);
    if (item.inclusionPercent < c.minInclusionPercent) check('ingredient-min', `${ing.name} inclusion ${item.inclusionPercent.toFixed(2)}% below minimum ${c.minInclusionPercent}%`, item.inclusionPercent, c.minInclusionPercent, item.ingredientId);
    if (item.inclusionPercent > c.maxInclusionPercent) check('ingredient-max', `${ing.name} inclusion ${item.inclusionPercent.toFixed(2)}% exceeds maximum ${c.maxInclusionPercent}%`, item.inclusionPercent, c.maxInclusionPercent, item.ingredientId);
  }
  return v;
}

/**
 * Solves a ration formulation problem using a greedy proportional allocation approach.
 * It prioritizes ingredients based on a value-for-money heuristic (nutrient density per cost).
 * @param ingredients - An array of available ingredient definitions.
 * @param constraints - Optional map of ingredient ID to specific constraints that override defaults.
 * @returns An object containing the formulated mix, its nutritional analysis, and total cost.
 * @throws {Error} If the sum of minimum inclusion constraints exceeds 100%.
 */
function solveGreedy(
  ingredients: readonly Ingredient[],
  constraints?: ConstraintMap
): { mix: RationIngredient[]; analysis: RationAnalysis; cost: number } {
  const n = ingredients.length;
  const pcts: number[] = new Array(n).fill(0);
  const effectiveConstraints = ingredients.map(i => getConstraint(i, constraints));

  let remaining = 100;
  // First, satisfy minimum inclusion percentages
  for (let i = 0; i < n; i++) {
    pcts[i] = effectiveConstraints[i].minInclusionPercent;
    remaining -= pcts[i];
  }

  if (remaining < -0.001) { // Allow for small floating point inaccuracies
    throw new Error('Sum of minimum inclusion constraints exceeds 100%');
  }

  // Identify ingredients that can still be increased (not at max constraint)
  const availableIndices = ingredients.map((_, i) => i).filter(i => pcts[i] < effectiveConstraints[i].maxInclusionPercent);

  // Sort available ingredients by a value-for-money heuristic (e.g., nutrient density per cost)
  // This heuristic is simplified and can be improved for more complex scenarios.
  availableIndices.sort((a, b) => {
    const ingA = ingredients[a];
    const ingB = ingredients[b];

    // Avoid division by zero if costPerUnit is 0
    const valA = ingA.costPerUnit > 0 ? (ingA.nutrients.crudeProtein + ingA.nutrients.energy / 1000) / ingA.costPerUnit : Infinity;
    const valB = ingB.costPerUnit > 0 ? (ingB.nutrients.crudeProtein + ingB.nutrients.energy / 1000) / ingB.costPerUnit : Infinity;
    return valB - valA; // Descending order (higher value first)
  });

  // Distribute remaining percentage to ingredients based on sorted order
  for (const idx of availableIndices) {
    if (remaining <= 0) break;
    const space = effectiveConstraints[idx].maxInclusionPercent - pcts[idx];
    const add = Math.min(space, remaining);
    pcts[idx] += add;
    remaining -= add;
  }

  // Normalize percentages if there's a slight deviation from 100 due to floating point arithmetic
  const currentSum = pcts.reduce((a, b) => a + b, 0);
  if (Math.abs(currentSum - 100) > 0.001) {
    const scaleFactor = 100 / currentSum;
    for (let i = 0; i < n; i++) {
      pcts[i] *= scaleFactor;
    }
  }

  const mix: RationIngredient[] = ingredients.map((ing, i) => ({
    ingredientId: ing.id,
    inclusionPercent: pcts[i],
    costContribution: (pcts[i] / 100) * ing.costPerUnit
  }));

  const analysis = calcAnalysis(ingredients, pcts);
  const totalCost = mix.reduce((s, m) => s + m.costContribution, 0);

  return { mix, analysis, cost: totalCost };
}

/**
 * Balance a ration to meet nutritional requirements at minimum cost using greedy proportional allocation.
 * This function attempts to find a feasible ration by prioritizing ingredients based on a cost-effectiveness heuristic.
 * If `allowInfeasible` is true in the config, it will return the best-effort solution even if constraints are violated.
 * @param input - Formulation parameters including available ingredients, species requirements, and optional configurations.
 * @returns Optimized ration with analysis and feasibility status.
 * @throws {Error} If no ingredients are provided or if the sum of minimum inclusion constraints exceeds 100%.
 * @throws {RangeError} If any ingredient cost is negative.
 * @example
 * // Assuming 'corn', 'soybeanMeal', and 'broilerRequirements' are defined Ingredient and SpeciesRequirements objects
 * const result = balanceRation({
 *   availableIngredients: [corn, soybeanMeal],
 *   requirements: broilerRequirements,
 *   config: { allowInfeasible: true }
 * });
 * console.log(result);
 */
export function balanceRation(input: RationFormulationInput): RationResult {
  if (input.availableIngredients.length === 0) {
    throw new Error('At least one ingredient must be provided for ration formulation.');
  }
  if (input.availableIngredients.some(i => i.costPerUnit < 0)) {
    throw new RangeError('Ingredient costs cannot be negative. Please ensure all costs are non-negative.');
  }

  const { mix, analysis, cost } = solveGreedy(input.availableIngredients, input.ingredientConstraints);
  const violations = findViolations(analysis, mix, input.requirements, input.availableIngredients, input.ingredientConstraints);
  const isFeasible = violations.length === 0;

  if (!isFeasible && !input.config?.allowInfeasible) {
    return { isFeasible: false, totalCostPerUnit: cost, mix, analysis, constraintViolations: violations };
  }
  return { isFeasible, totalCostPerUnit: cost, mix, analysis, ...(violations.length > 0 ? { constraintViolations: violations } : {}) };
}

/**
 * Compute nutrient analysis for a given ingredient mix.
 * This function takes a list of ingredients and their desired inclusion percentages
 * and calculates the overall nutritional profile of the resulting mixture.
 * @param ingredients - An array of ingredient definitions.
 * @param inclusionPercents - An array of inclusion percentages for each ingredient. These must sum to 100.
 * @returns The calculated `RationAnalysis` of the mixture.
 * @throws {Error} If the lengths of `ingredients` and `inclusionPercents` arrays do not match.
 * @throws {RangeError} If inclusion percentages contain negative values or do not sum to 100 (within a small tolerance).
 * @example
 * // Assuming 'corn' and 'soybeanMeal' are defined Ingredient objects
 * const analysis = computeRationNutrients([corn, soybeanMeal], [80, 20]);
 * console.log(analysis);
 */
export function computeRationNutrients(
  ingredients: readonly Ingredient[],
  inclusionPercents: readonly number[]
): RationAnalysis {
  if (ingredients.length !== inclusionPercents.length) {
    throw new Error(`Ingredients array length (${ingredients.length}) must match inclusionPercents array length (${inclusionPercents.length}).`);
  }
  if (inclusionPercents.some(p => p < 0)) {
    throw new RangeError('Inclusion percentages cannot be negative. All percentages must be 0 or greater.');
  }
  const sum = inclusionPercents.reduce((a, b) => a + b, 0);
  // Using a small tolerance for floating point comparison
  if (Math.abs(sum - 100) > 0.01) {
    throw new RangeError(`Inclusion percentages must sum to 100, but they sum to ${sum.toFixed(2)}.`);
  }
  return calcAnalysis(ingredients, inclusionPercents);
}