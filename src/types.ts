/**
 * Branded type for ingredient identifiers to prevent accidental mixing with other string IDs.
 */
export type IngredientId = string & { readonly __brand: 'IngredientId' };

/**
 * Branded type for species identifiers to prevent accidental mixing with other string IDs.
 */
export type SpeciesId = string & { readonly __brand: 'SpeciesId' };

/**
 * Nutritional composition of a feed ingredient per unit weight.
 * Protein, calcium, and phosphorus are percentages (0-100).
 * Energy is in kcal/kg (metabolizable for poultry, digestible for swine).
 */
export interface NutrientProfile {
  /** Crude protein percentage (0-100) */
  readonly crudeProtein: number;
  /** Energy content in kcal/kg */
  readonly energy: number;
  /** Calcium percentage (0-100) */
  readonly calcium: number;
  /** Available phosphorus percentage (0-100) */
  readonly phosphorus: number;
}

/**
 * Inclusion constraints for an ingredient in a ration formulation.
 * Values are percentages (0-100). Undefined bounds indicate no constraint.
 */
export interface IngredientConstraint {
  /** Minimum inclusion percentage (0-100, inclusive) */
  readonly minInclusionPercent?: number;
  /** Maximum inclusion percentage (0-100, inclusive) */
  readonly maxInclusionPercent?: number;
}

/**
 * Feed ingredient definition with cost and nutritional profile.
 */
export interface Ingredient {
  /** Unique identifier */
  readonly id: IngredientId;
  /** Human-readable name (e.g., "Yellow Corn", "Soybean Meal 48% CP") */
  readonly name: string;
  /** Cost per unit weight (currency per kg or lb) */
  readonly costPerUnit: number;
  /** Nutritional composition per unit weight */
  readonly nutrients: NutrientProfile;
  /** Optional default constraints if not overridden in formulation */
  readonly defaultConstraint?: IngredientConstraint;
}

/**
 * Nutritional requirements for a specific species and life stage.
 * Min values are mandatory targets; max values are optional upper bounds.
 */
export interface SpeciesRequirements {
  /** Unique identifier (e.g., "broiler-starter", "dairy-lactating-cow") */
  readonly speciesId: SpeciesId;
  /** Display name for the species/stage */
  readonly speciesName: string;
  /** Minimum crude protein percentage required */
  readonly minCrudeProtein: number;
  /** Maximum crude protein percentage allowed (optional) */
  readonly maxCrudeProtein?: number;
  /** Minimum energy required (kcal/kg) */
  readonly minEnergy: number;
  /** Maximum energy allowed (optional) */
  readonly maxEnergy?: number;
  /** Minimum calcium percentage required */
  readonly minCalcium: number;
  /** Maximum calcium percentage allowed (optional) */
  readonly maxCalcium?: number;
  /** Minimum phosphorus percentage required */
  readonly minPhosphorus: number;
  /** Maximum phosphorus percentage allowed (optional) */
  readonly maxPhosphorus?: number;
}

/**
 * Single ingredient inclusion in an optimized ration mix.
 */
export interface RationIngredient {
  /** Reference to the ingredient */
  readonly ingredientId: IngredientId;
  /** Calculated inclusion percentage (0-100) */
  readonly inclusionPercent: number;
  /** Cost contribution of this ingredient to the total ration cost */
  readonly costContribution: number;
}

/**
 * Nutritional analysis of a formulated ration.
 */
export interface RationAnalysis {
  /** Actual crude protein percentage */
  readonly crudeProtein: number;
  /** Actual energy content (kcal/kg) */
  readonly energy: number;
  /** Actual calcium percentage */
  readonly calcium: number;
  /** Actual phosphorus percentage */
  readonly phosphorus: number;
}

/**
 * Description of a violated constraint when formulation is infeasible.
 */
export interface ConstraintViolation {
  /** Category of violated constraint */
  readonly type: 'protein-min' | 'protein-max' | 'energy-min' | 'energy-max' | 'calcium-min' | 'calcium-max' | 'phosphorus-min' | 'phosphorus-max' | 'ingredient-min' | 'ingredient-max';
  /** Human-readable description of the violation */
  readonly message: string;
  /** Value actually achieved in the solution */
  readonly actualValue: number;
  /** Target value that was required */
  readonly targetValue: number;
  /** Associated ingredient if this is an ingredient-level constraint violation */
  readonly ingredientId?: IngredientId;
}

/**
 * Result of a ration optimization calculation.
 */
export interface RationResult {
  /** Whether all nutritional and inclusion constraints were satisfied */
  readonly isFeasible: boolean;
  /** Total cost per unit weight of the final ration */
  readonly totalCostPerUnit: number;
  /** Optimized ingredient mix (percentages sum to 100 when feasible) */
  readonly mix: readonly RationIngredient[];
  /** Nutritional analysis of the final mix */
  readonly analysis: RationAnalysis;
  /** Constraint violations if solution is infeasible */
  readonly constraintViolations?: readonly ConstraintViolation[];
}

/**
 * Configuration options for the least-cost ration optimizer.
 */
export interface OptimizerConfig {
  /** Maximum solver iterations before stopping (default: 1000) */
  readonly maxIterations?: number;
  /** Cost improvement tolerance for convergence (default: 0.0001) */
  readonly tolerance?: number;
  /** Allow returning best-effort solution when constraints cannot be met (default: false) */
  readonly allowInfeasible?: boolean;
  /** Penalty weight for constraint violations when allowInfeasible is true (default: 1000) */
  readonly constraintPenaltyWeight?: number;
  /** Batch size in weight units for scaling absolute quantities (default: 1000) */
  readonly batchSize?: number;
}

/**
 * Input parameters for a ration formulation request.
 */
export interface RationFormulationInput {
  /** Pool of available ingredients to formulate from */
  readonly availableIngredients: readonly Ingredient[];
  /** Target species nutritional requirements */
  readonly requirements: SpeciesRequirements;
  /** Per-ingredient constraints overriding defaults (keyed by ingredient ID) */
  readonly ingredientConstraints?: Readonly<Record<IngredientId, IngredientConstraint>>;
  /** Optimizer behavior configuration */
  readonly config?: OptimizerConfig;
}