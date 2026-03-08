import type {
  Ingredient,
  IngredientId,
  NutrientProfile,
  IngredientConstraint,
  RationFormulationInput,
  SpeciesRequirements,
} from './types.js';

/**
 * Validation error with field path and constraint details.
 */
export interface ValidationError {
  /** Dot-separated path to the invalid field (e.g. "nutrients.crudeProtein") */
  readonly field: string;
  /** Human-readable error message */
  readonly message: string;
  /** The invalid value that was provided */
  readonly value: unknown;
}

/**
 * Result of a validation operation.
 */
export interface ValidationResult {
  /** Whether the input passed all validation checks */
  readonly valid: boolean;
  /** List of validation errors (empty when valid) */
  readonly errors: readonly ValidationError[];
}

function err(field: string, message: string, value: unknown): ValidationError {
  return { field, message, value };
}

/**
 * Validates a single NutrientProfile object.
 * @param nutrients - The nutrient profile to validate.
 * @param prefix - Field path prefix for error messages.
 * @returns Array of validation errors found.
 */
export function validateNutrientProfile(
  nutrients: unknown,
  prefix = 'nutrients',
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nutrients === null || nutrients === undefined || typeof nutrients !== 'object') {
    errors.push(err(prefix, 'Nutrient profile must be a non-null object', nutrients));
    return errors;
  }

  const n = nutrients as Record<string, unknown>;

  // crudeProtein: required, 0-100
  if (typeof n.crudeProtein !== 'number' || Number.isNaN(n.crudeProtein)) {
    errors.push(err(`${prefix}.crudeProtein`, 'Crude protein must be a number', n.crudeProtein));
  } else if (n.crudeProtein < 0 || n.crudeProtein > 100) {
    errors.push(err(`${prefix}.crudeProtein`, 'Crude protein must be between 0 and 100', n.crudeProtein));
  }

  // energy: required, >= 0
  if (typeof n.energy !== 'number' || Number.isNaN(n.energy)) {
    errors.push(err(`${prefix}.energy`, 'Energy must be a number', n.energy));
  } else if (n.energy < 0) {
    errors.push(err(`${prefix}.energy`, 'Energy must be non-negative', n.energy));
  } else if (n.energy > 10000) {
    errors.push(err(`${prefix}.energy`, 'Energy must not exceed 10000 kcal/kg', n.energy));
  }

  // calcium: required, 0-100
  if (typeof n.calcium !== 'number' || Number.isNaN(n.calcium)) {
    errors.push(err(`${prefix}.calcium`, 'Calcium must be a number', n.calcium));
  } else if (n.calcium < 0 || n.calcium > 100) {
    errors.push(err(`${prefix}.calcium`, 'Calcium must be between 0 and 100', n.calcium));
  }

  // phosphorus: required, 0-100
  if (typeof n.phosphorus !== 'number' || Number.isNaN(n.phosphorus)) {
    errors.push(err(`${prefix}.phosphorus`, 'Phosphorus must be a number', n.phosphorus));
  } else if (n.phosphorus < 0 || n.phosphorus > 100) {
    errors.push(err(`${prefix}.phosphorus`, 'Phosphorus must be between 0 and 100', n.phosphorus));
  }

  return errors;
}

/**
 * Validates an IngredientConstraint object.
 * @param constraint - The constraint to validate.
 * @param ingredientName - Name of the ingredient for error context.
 * @param prefix - Field path prefix.
 * @returns Array of validation errors found.
 */
export function validateIngredientConstraint(
  constraint: unknown,
  ingredientName: string,
  prefix = 'defaultConstraint',
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (constraint === null || constraint === undefined) {
    return errors; // optional field
  }

  if (typeof constraint !== 'object') {
    errors.push(err(prefix, `Constraint for ${ingredientName} must be an object`, constraint));
    return errors;
  }

  const c = constraint as Record<string, unknown>;

  if (c.minInclusionPercent !== undefined) {
    if (typeof c.minInclusionPercent !== 'number' || Number.isNaN(c.minInclusionPercent)) {
      errors.push(err(`${prefix}.minInclusionPercent`, `Min inclusion for ${ingredientName} must be a number`, c.minInclusionPercent));
    } else if (c.minInclusionPercent < 0 || c.minInclusionPercent > 100) {
      errors.push(err(`${prefix}.minInclusionPercent`, `Min inclusion for ${ingredientName} must be between 0 and 100`, c.minInclusionPercent));
    }
  }

  if (c.maxInclusionPercent !== undefined) {
    if (typeof c.maxInclusionPercent !== 'number' || Number.isNaN(c.maxInclusionPercent)) {
      errors.push(err(`${prefix}.maxInclusionPercent`, `Max inclusion for ${ingredientName} must be a number`, c.maxInclusionPercent));
    } else if (c.maxInclusionPercent < 0 || c.maxInclusionPercent > 100) {
      errors.push(err(`${prefix}.maxInclusionPercent`, `Max inclusion for ${ingredientName} must be between 0 and 100`, c.maxInclusionPercent));
    }
  }

  // Cross-field: min <= max
  if (
    typeof c.minInclusionPercent === 'number' &&
    typeof c.maxInclusionPercent === 'number' &&
    !Number.isNaN(c.minInclusionPercent) &&
    !Number.isNaN(c.maxInclusionPercent) &&
    c.minInclusionPercent > c.maxInclusionPercent
  ) {
    errors.push(err(prefix, `Min inclusion (${c.minInclusionPercent}%) exceeds max inclusion (${c.maxInclusionPercent}%) for ${ingredientName}`, constraint));
  }

  return errors;
}

/**
 * Validates a single feed ingredient definition.
 * Checks id, name, costPerUnit, nutrient profile, and optional default constraints.
 * @param ingredient - The ingredient to validate.
 * @param index - Optional index for error context when validating arrays.
 * @returns A ValidationResult indicating whether the ingredient is valid.
 */
export function validateIngredient(
  ingredient: unknown,
  index?: number,
): ValidationResult {
  const errors: ValidationError[] = [];
  const pfx = index !== undefined ? `ingredients[${index}]` : 'ingredient';

  if (ingredient === null || ingredient === undefined || typeof ingredient !== 'object') {
    errors.push(err(pfx, 'Ingredient must be a non-null object', ingredient));
    return { valid: false, errors };
  }

  const ing = ingredient as Record<string, unknown>;

  // id
  if (typeof ing.id !== 'string' || ing.id.trim() === '') {
    errors.push(err(`${pfx}.id`, 'Ingredient id must be a non-empty string', ing.id));
  }

  // name
  if (typeof ing.name !== 'string' || ing.name.trim() === '') {
    errors.push(err(`${pfx}.name`, 'Ingredient name must be a non-empty string', ing.name));
  }

  // costPerUnit
  if (typeof ing.costPerUnit !== 'number' || Number.isNaN(ing.costPerUnit)) {
    errors.push(err(`${pfx}.costPerUnit`, 'Cost per unit must be a number', ing.costPerUnit));
  } else if (ing.costPerUnit < 0) {
    errors.push(err(`${pfx}.costPerUnit`, 'Cost per unit must be non-negative', ing.costPerUnit));
  }

  // nutrients
  errors.push(...validateNutrientProfile(ing.nutrients, `${pfx}.nutrients`));

  // defaultConstraint (optional)
  if (ing.defaultConstraint !== undefined) {
    errors.push(
      ...validateIngredientConstraint(
        ing.defaultConstraint,
        typeof ing.name === 'string' ? ing.name : `at index ${index ?? '?'}`,
        `${pfx}.defaultConstraint`,
      ),
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates an array of feed ingredients.
 * Checks each ingredient individually and also checks for duplicate IDs.
 * @param ingredients - The array of ingredients to validate.
 * @returns A ValidationResult with all errors across all ingredients.
 */
export function validateIngredients(
  ingredients: unknown,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(ingredients)) {
    errors.push(err('ingredients', 'Ingredients must be an array', ingredients));
    return { valid: false, errors };
  }

  if (ingredients.length === 0) {
    errors.push(err('ingredients', 'At least one ingredient must be provided', ingredients));
    return { valid: false, errors };
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < ingredients.length; i++) {
    const result = validateIngredient(ingredients[i], i);
    errors.push(...result.errors);

    // Check for duplicate IDs
    const ing = ingredients[i];
    if (ing && typeof ing === 'object' && typeof (ing as Record<string, unknown>).id === 'string') {
      const id = (ing as Record<string, unknown>).id as string;
      if (seenIds.has(id)) {
        errors.push(err(`ingredients[${i}].id`, `Duplicate ingredient id: "${id}"`, id));
      }
      seenIds.add(id);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a complete RationFormulationInput object.
 * Checks ingredients, requirements, constraints, and optimizer config.
 * @param input - The formulation input to validate.
 * @returns A ValidationResult for the entire input.
 */
export function validateFormulationRequest(
  input: unknown,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (input === null || input === undefined || typeof input !== 'object') {
    errors.push(err('input', 'Formulation input must be a non-null object', input));
    return { valid: false, errors };
  }

  const inp = input as Record<string, unknown>;

  // Validate ingredients
  const ingredientResult = validateIngredients(inp.availableIngredients);
  errors.push(...ingredientResult.errors);

  // Validate requirements
  if (inp.requirements === null || inp.requirements === undefined || typeof inp.requirements !== 'object') {
    errors.push(err('requirements', 'Species requirements must be a non-null object', inp.requirements));
  } else {
    const req = inp.requirements as Record<string, unknown>;

    if (typeof req.minCrudeProtein !== 'number' || req.minCrudeProtein < 0 || req.minCrudeProtein > 100) {
      errors.push(err('requirements.minCrudeProtein', 'Min crude protein must be a number between 0 and 100', req.minCrudeProtein));
    }
    if (typeof req.minEnergy !== 'number' || req.minEnergy < 0) {
      errors.push(err('requirements.minEnergy', 'Min energy must be a non-negative number', req.minEnergy));
    }
    if (typeof req.minCalcium !== 'number' || req.minCalcium < 0 || req.minCalcium > 100) {
      errors.push(err('requirements.minCalcium', 'Min calcium must be a number between 0 and 100', req.minCalcium));
    }
    if (typeof req.minPhosphorus !== 'number' || req.minPhosphorus < 0 || req.minPhosphorus > 100) {
      errors.push(err('requirements.minPhosphorus', 'Min phosphorus must be a number between 0 and 100', req.minPhosphorus));
    }

    // Cross-field checks for min/max pairs
    if (typeof req.maxCrudeProtein === 'number' && typeof req.minCrudeProtein === 'number' && req.maxCrudeProtein < req.minCrudeProtein) {
      errors.push(err('requirements.maxCrudeProtein', `Max crude protein (${req.maxCrudeProtein}) cannot be less than min (${req.minCrudeProtein})`, req.maxCrudeProtein));
    }
    if (typeof req.maxEnergy === 'number' && typeof req.minEnergy === 'number' && req.maxEnergy < req.minEnergy) {
      errors.push(err('requirements.maxEnergy', `Max energy (${req.maxEnergy}) cannot be less than min (${req.minEnergy})`, req.maxEnergy));
    }
    if (typeof req.maxCalcium === 'number' && typeof req.minCalcium === 'number' && req.maxCalcium < req.minCalcium) {
      errors.push(err('requirements.maxCalcium', `Max calcium (${req.maxCalcium}) cannot be less than min (${req.minCalcium})`, req.maxCalcium));
    }
    if (typeof req.maxPhosphorus === 'number' && typeof req.minPhosphorus === 'number' && req.maxPhosphorus < req.minPhosphorus) {
      errors.push(err('requirements.maxPhosphorus', `Max phosphorus (${req.maxPhosphorus}) cannot be less than min (${req.minPhosphorus})`, req.maxPhosphorus));
    }
  }

  // Validate ingredient constraint overrides reference existing ingredients
  if (inp.ingredientConstraints !== null && inp.ingredientConstraints !== undefined && typeof inp.ingredientConstraints === 'object') {
    const validIds = new Set<string>();
    if (Array.isArray(inp.availableIngredients)) {
      for (const ing of inp.availableIngredients) {
        if (ing && typeof ing === 'object' && typeof (ing as Record<string, unknown>).id === 'string') {
          validIds.add((ing as Record<string, unknown>).id as string);
        }
      }
    }
    for (const id of Object.keys(inp.ingredientConstraints as Record<string, unknown>)) {
      if (!validIds.has(id)) {
        errors.push(err(`ingredientConstraints.${id}`, `Constraint references unknown ingredient id: "${id}"`, id));
      }
      const constraint = (inp.ingredientConstraints as Record<string, unknown>)[id];
      errors.push(...validateIngredientConstraint(constraint, id, `ingredientConstraints.${id}`));
    }
  }

  return { valid: errors.length === 0, errors };
}
