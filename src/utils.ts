import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import type {
  Ingredient,
  IngredientId,
  SpeciesRequirements,
  RationFormulationInput,
  OptimizerConfig,
  IngredientConstraint,
  NutrientProfile,
} from "./types";

/**
 * Default data directory for feed-mix.
 * @internal
 */
const DEFAULT_DATA_DIR = path.join(os.homedir(), ".feed-mix");

/**
 * Validates if a number is within a specified range (inclusive).
 * @param value - The number to validate.
 * @param min - The minimum allowed value.
 * @param max - The maximum allowed value.
 * @param name - The name of the value for error messages.
 * @returns The validated number.
 * @throws {RangeError} If the value is outside the specified range.
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string,
): number {
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}, got ${value}`);
  }
  return value;
}

/**
 * Creates a branded IngredientId.
 * @param id - The string identifier for the ingredient.
 * @returns A branded IngredientId.
 */
export function createIngredientId(id: string): IngredientId {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Ingredient ID must be a non-empty string.");
  }
  return id as IngredientId;
}

/**
 * Calculates the total nutrient profile for a given list of ingredients and their inclusion percentages.
 * This function is useful for internal calculations or for analyzing a pre-defined mix.
 * @param ingredients - An array of `Ingredient` objects.
 * @param inclusionPercentages - An array of numbers representing the percentage of each ingredient in the mix (0-100).
 *   The sum of these percentages should ideally be 100, but the function will normalize if it's close.
 * @returns The combined `NutrientProfile` of the mix.
 * @throws {Error} If the lengths of `ingredients` and `inclusionPercentages` do not match.
 * @throws {RangeError} If any inclusion percentage is negative or if the sum is significantly off 100%.
 * @example
 * const corn: Ingredient = {
 *   id: createIngredientId("corn"), name: "Corn", costPerUnit: 0.2,
 *   nutrients: { crudeProtein: 8, energy: 3350, calcium: 0.02, phosphorus: 0.28 }
 * };
 * const soybeanMeal: Ingredient = {
 *   id: createIngredientId("soybean-meal"), name: "Soybean Meal", costPerUnit: 0.4,
 *   nutrients: { crudeProtein: 48, energy: 2200, calcium: 0.25, phosphorus: 0.65 }
 * };
 * const mixNutrients = calculateMixNutrients([corn, soybeanMeal], [70, 30]);
 * console.log(mixNutrients);
 */
export function calculateMixNutrients(
  ingredients: readonly Ingredient[],
  inclusionPercentages: readonly number[],
): NutrientProfile {
  if (ingredients.length !== inclusionPercentages.length) {
    throw new Error(
      "Lengths of ingredients and inclusionPercentages arrays must match.",
    );
  }

  const totalPercentage = inclusionPercentages.reduce((sum, p) => {
    if (p < 0) {
      throw new RangeError(
        `Inclusion percentage cannot be negative, got ${p}.`,
      );
    }
    return sum + p;
  }, 0);

  // Allow for slight floating point inaccuracies
  const EPSILON = 0.001;
  if (Math.abs(totalPercentage - 100) > EPSILON) {
    throw new RangeError(
      `Inclusion percentages must sum to 100 (or very close), got ${totalPercentage}.`,
    );
  }

  let crudeProtein = 0;
  let energy = 0;
  let calcium = 0;
  let phosphorus = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    const percentage = inclusionPercentages[i] / 100; // Convert to fraction

    crudeProtein += ingredient.nutrients.crudeProtein * percentage;
    energy += ingredient.nutrients.energy * percentage;
    calcium += ingredient.nutrients.calcium * percentage;
    phosphorus += ingredient.nutrients.phosphorus * percentage;
  }

  return { crudeProtein, energy, calcium, phosphorus };
}

/**
 * Merges default ingredient constraints with user-provided overrides.
 * @param ingredient - The ingredient definition.
 * @param overrides - Optional user-provided constraints for this ingredient.
 * @returns The effective `IngredientConstraint` for the ingredient.
 * @example
 * const corn: Ingredient = {
 *   id: createIngredientId("corn"), name: "Corn", costPerUnit: 0.2,
 *   nutrients: { crudeProtein: 8, energy: 3350, calcium: 0.02, phosphorus: 0.28 },
 *   defaultConstraint: { minInclusionPercent: 10, maxInclusionPercent: 70 }
 * };
 * const effectiveConstraints = getEffectiveIngredientConstraint(corn, { maxInclusionPercent: 60 });
 * // effectiveConstraints will be { minInclusionPercent: 10, maxInclusionPercent: 60 }
 */
export function getEffectiveIngredientConstraint(
  ingredient: Ingredient,
  overrides?: IngredientConstraint,
): IngredientConstraint {
  const effective: IngredientConstraint = { ...ingredient.defaultConstraint };

  if (overrides?.minInclusionPercent !== undefined) {
    effective.minInclusionPercent = overrides.minInclusionPercent;
  }
  if (overrides?.maxInclusionPercent !== undefined) {
    effective.maxInclusionPercent = overrides.maxInclusionPercent;
  }

  if (
    effective.minInclusionPercent !== undefined &&
    effective.maxInclusionPercent !== undefined &&
    effective.minInclusionPercent > effective.maxInclusionPercent
  ) {
    throw new RangeError(
      `Min inclusion percent (${effective.minInclusionPercent}) cannot be greater than max inclusion percent (${effective.maxInclusionPercent}) for ingredient ${ingredient.name}.`,
    );
  }

  if (
    effective.minInclusionPercent !== undefined &&
    (effective.minInclusionPercent < 0 || effective.minInclusionPercent > 100)
  ) {
    throw new RangeError(
      `Min inclusion percent for ${ingredient.name} must be between 0 and 100, got ${effective.minInclusionPercent}.`,
    );
  }

  if (
    effective.maxInclusionPercent !== undefined &&
    (effective.maxInclusionPercent < 0 || effective.maxInclusionPercent > 100)
  ) {
    throw new RangeError(
      `Max inclusion percent for ${ingredient.name} must be between 0 and 100, got ${effective.maxInclusionPercent}.`,
    );
  }

  return effective;
}

/**
 * Initializes and validates the optimizer configuration, applying default values where not specified.
 * @param config - Optional user-provided optimizer configuration.
 * @returns A complete `OptimizerConfig` object with all properties defined.
 * @throws {RangeError} If any configuration value is out of its valid range.
 */
export function initializeOptimizerConfig(
  config?: OptimizerConfig,
): Required<OptimizerConfig> {
  const defaultConfig: Required<OptimizerConfig> = {
    maxIterations: 1000,
    tolerance: 0.0001,
    allowInfeasible: false,
    constraintPenaltyWeight: 1000,
    batchSize: 1000, // kg or lb
  };

  const effectiveConfig = { ...defaultConfig, ...config };

  validateRange(
    effectiveConfig.maxIterations,
    1,
    100000,
    "maxIterations",
  );
  validateRange(effectiveConfig.tolerance, 0, 1, "tolerance");
  validateRange(
    effectiveConfig.constraintPenaltyWeight,
    0,
    1000000,
    "constraintPenaltyWeight",
  );
  validateRange(effectiveConfig.batchSize, 1, 100000, "batchSize");

  return effectiveConfig;
}

/**
 * Validates the overall `RationFormulationInput` to ensure consistency and correctness.
 * This includes checking ingredient costs, constraint ranges, and requirement values.
 * @param input - The input object for ration formulation.
 * @throws {Error} For general validation failures (e.g., empty ingredient list).
 * @throws {RangeError} For numeric values out of their valid ranges.
 * @example
 * const validIngredients: Ingredient[] = [...];
 * const validRequirements: SpeciesRequirements = {...};
 * validateFormulationInput({ availableIngredients: validIngredients, requirements: validRequirements }); // No error
 */
export function validateFormulationInput(input: RationFormulationInput): void {
  if (!input.availableIngredients || input.availableIngredients.length === 0) {
    throw new Error("At least one ingredient must be provided.");
  }

  const ingredientIds = new Set<IngredientId>();
  for (const ingredient of input.availableIngredients) {
    if (ingredientIds.has(ingredient.id)) {
      throw new Error(`Duplicate ingredient ID found: ${ingredient.id}`);
    }
    ingredientIds.add(ingredient.id);

    if (ingredient.costPerUnit < 0) {
      throw new RangeError(
        `Ingredient '${ingredient.name}' has a negative cost per unit: ${ingredient.costPerUnit}.`,
      );
    }

    // Validate nutrient profiles
    validateRange(
      ingredient.nutrients.crudeProtein,
      0,
      100,
      `Crude protein for ${ingredient.name}`,
    );
    validateRange(
      ingredient.nutrients.energy,
      0,
      10000,
      `Energy for ${ingredient.name}`,
    ); // Arbitrary max for energy
    validateRange(
      ingredient.nutrients.calcium,
      0,
      100,
      `Calcium for ${ingredient.name}`,
    );
    validateRange(
      ingredient.nutrients.phosphorus,
      0,
      100,
      `Phosphorus for ${ingredient.name}`,
    );

    // Validate default constraints
    if (ingredient.defaultConstraint) {
      getEffectiveIngredientConstraint(ingredient, undefined); // This will validate default constraints
    }
  }

  // Validate species requirements
  const req = input.requirements;
  validateRange(req.minCrudeProtein, 0, 100, "Minimum crude protein");
  if (req.maxCrudeProtein !== undefined) {
    validateRange(req.maxCrudeProtein, 0, 100, "Maximum crude protein");
    if (req.maxCrudeProtein < req.minCrudeProtein) {
      throw new RangeError(
        `Maximum crude protein (${req.maxCrudeProtein}) cannot be less than minimum crude protein (${req.minCrudeProtein}).`,
      );
    }
  }

  validateRange(req.minEnergy, 0, 10000, "Minimum energy");
  if (req.maxEnergy !== undefined) {
    validateRange(req.maxEnergy, 0, 10000, "Maximum energy");
    if (req.maxEnergy < req.minEnergy) {
      throw new RangeError(
        `Maximum energy (${req.maxEnergy}) cannot be less than minimum energy (${req.minEnergy}).`,
      );
    }
  }

  validateRange(req.minCalcium, 0, 100, "Minimum calcium");
  if (req.maxCalcium !== undefined) {
    validateRange(req.maxCalcium, 0, 100, "Maximum calcium");
    if (req.maxCalcium < req.minCalcium) {
      throw new RangeError(
        `Maximum calcium (${req.maxCalcium}) cannot be less than minimum calcium (${req.minCalcium}).`,
      );
    }
  }

  validateRange(req.minPhosphorus, 0, 100, "Minimum phosphorus");
  if (req.maxPhosphorus !== undefined) {
    validateRange(req.maxPhosphorus, 0, 100, "Maximum phosphorus");
    if (req.maxPhosphorus < req.minPhosphorus) {
      throw new RangeError(
        `Maximum phosphorus (${req.maxPhosphorus}) cannot be less than minimum phosphorus (${req.minPhosphorus}).`,
      );
    }
  }

  // Validate ingredient constraints overrides
  if (input.ingredientConstraints) {
    for (const id in input.ingredientConstraints) {
      if (!ingredientIds.has(id as IngredientId)) {
        throw new Error(
          `Ingredient constraint provided for unknown ingredient ID: ${id}.`,
        );
      }
      // Temporarily create a dummy ingredient to use getEffectiveIngredientConstraint for validation
      const dummyIngredient: Ingredient = {
        id: id as IngredientId,
        name: `Ingredient ${id}`,
        costPerUnit: 0,
        nutrients: { crudeProtein: 0, energy: 0, calcium: 0, phosphorus: 0 },
      };
      getEffectiveIngredientConstraint(
        dummyIngredient,
        input.ingredientConstraints[id as IngredientId],
      );
    }
  }

  // Initialize and validate optimizer config
  initializeOptimizerConfig(input.config);
}

/**
 * Ensures the default data directory exists. If not, it creates it.
 * @returns The path to the data directory.
 * @example
 * const dataDir = ensureDataDirectory();
 * console.log(`Data directory is at: ${dataDir}`);
 */
export function ensureDataDirectory(): string {
  if (!fs.existsSync(DEFAULT_DATA_DIR)) {
    fs.mkdirSync(DEFAULT_DATA_DIR, { recursive: true });
  }
  return DEFAULT_DATA_DIR;
}

/**
 * Loads data from a JSON file within the default data directory.
 * @param filename - The name of the JSON file (e.g., "ingredients.json").
 * @returns The parsed JSON data.
 * @throws {Error} If the file does not exist or contains invalid JSON.
 * @example
 * const ingredients = loadDataFile("ingredients.json");
 * console.log(ingredients);
 */
export function loadDataFile<T>(filename: string): T {
  const filePath = path.join(ensureDataDirectory(), filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }
  try {
    const rawData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(rawData) as T;
  } catch (error) {
    throw new Error(`Failed to parse data file ${filePath}: ${error}`);
  }
}

/**
 * Saves data to a JSON file within the default data directory.
 * @param filename - The name of the JSON file (e.g., "ingredients.json").
 * @param data - The data to save.
 * @example
 * const myIngredients = [{ id: createIngredientId("test"), name: "Test", costPerUnit: 1, nutrients: { crudeProtein: 10, energy: 1000, calcium: 1, phosphorus: 1 } }];
 * saveDataFile("my-ingredients.json", myIngredients);
 */
export function saveDataFile<T>(filename: string, data: T): void {
  const filePath = path.join(ensureDataDirectory(), filename);
  try {
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonData, "utf-8");
  } catch (error) {
    throw new Error(`Failed to write data file ${filePath}: ${error}`);
  }
}