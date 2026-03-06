import { describe, it, expect } from "bun:test";
import {
  balanceRation,
  computeRationNutrients,
  getSpeciesRequirements,
  convertEnergy,
} from "../src/index.ts";
import type {
  Ingredient,
  RationRequest,
  RationIngredient,
  NutrientTargets,
  IngredientConstraint,
} from "../src/index.ts";

describe("feed-mix public API", () => {
  it("should produce a feasible ration for chicken laying requirements respecting constraints", () => {
    const corn: Ingredient = {
      id: "corn",
      name: "Yellow Corn",
      nutrients: { protein: 8.5, energy: 3.35, calcium: 0.02, phosphorus: 0.28 },
      costPerKg: 0.25,
      dryMatterPct: 88,
    };

    const soybeanMeal: Ingredient = {
      id: "soybean-meal",
      name: "Soybean Meal",
      nutrients: { protein: 48.0, energy: 2.2, calcium: 0.25, phosphorus: 0.65 },
      costPerKg: 0.45,
      dryMatterPct: 90,
    };

    const limestone: Ingredient = {
      id: "limestone",
      name: "Limestone",
      nutrients: { protein: 0, energy: 0, calcium: 38.0, phosphorus: 0.02 },
      costPerKg: 0.05,
      dryMatterPct: 98,
    };

    const targets: NutrientTargets = {
      protein: { min: 16, max: 18 },
      energy: { min: 2.8, max: 3.0 },
      calcium: { min: 3.5, max: 4.0 },
      phosphorus: { min: 0.3, max: 0.4 },
    };

    const constraints: IngredientConstraint[] = [
      { ingredientId: "corn", minPct: 0, maxPct: 70 },
      { ingredientId: "soybean-meal", minPct: 10, maxPct: 40 },
      { ingredientId: "limestone", minPct: 0, maxPct: 10 },
    ];

    const request: RationRequest = {
      ingredients: [corn, soybeanMeal, limestone],
      constraints,
      targets,
      totalKg: 100,
    };

    const result = balanceRation(request);

    expect(result.feasible).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.costPerKg).toBeGreaterThan(0);
    expect(result.ingredients.length).toBe(3);

    const cornInclusion = result.ingredients.find((ri) => ri.ingredient.id === "corn");
    const soyInclusion = result.ingredients.find((ri) => ri.ingredient.id === "soybean-meal");

    expect(cornInclusion!.inclusionPct).toBeLessThanOrEqual(70);
    expect(soyInclusion!.inclusionPct).toBeGreaterThanOrEqual(10);
    expect(soyInclusion!.inclusionPct).toBeLessThanOrEqual(40);
  });

  it("should return infeasible result with warnings when nutrient targets are impossible", () => {
    const corn: Ingredient = {
      id: "corn",
      name: "Corn",
      nutrients: { protein: 8, energy: 3.35, calcium: 0.02, phosphorus: 0.28 },
      costPerKg: 0.2,
      dryMatterPct: 88,
    };

    const targets: NutrientTargets = {
      protein: { min: 50, max: 60 },
      energy: { min: 3, max: 3.5 },
      calcium: { min: 0, max: 1 },
      phosphorus: { min: 0, max: 1 },
    };

    const request: RationRequest = {
      ingredients: [corn],
      constraints: [],
      targets,
    };

    const result = balanceRation(request);

    expect(result.feasible).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should compute weighted average nutrients for a ration mix", () => {
    const corn: Ingredient = {
      id: "corn",
      name: "Corn",
      nutrients: { protein: 10, energy: 3.0, calcium: 0.1, phosphorus: 0.3 },
      costPerKg: 0.2,
      dryMatterPct: 90,
    };

    const soybeanMeal: Ingredient = {
      id: "soybean-meal",
      name: "Soybean Meal",
      nutrients: { protein: 50, energy: 2.0, calcium: 0.3, phosphorus: 0.7 },
      costPerKg: 0.4,
      dryMatterPct: 90,
    };

    const rationIngredients: RationIngredient[] = [
      { ingredient: corn, inclusionPct: 80, kgPer100kg: 80 },
      { ingredient: soybeanMeal, inclusionPct: 20, kgPer100kg: 20 },
    ];

    const result = computeRationNutrients(rationIngredients);

    expect(result.protein).toBe(18);
    expect(result.energy).toBe(2.8);
    expect(result.calcium).toBe(0.14);
    expect(result.phosphorus).toBe(0.38);
  });

  it("should return correct nutrient targets for cattle maintenance", () => {
    const requirements = getSpeciesRequirements("cattle", "maintenance");

    expect(requirements).toBeDefined();
    expect(requirements!.species).toBe("cattle");
    expect(requirements!.stage).toBe("maintenance");
    expect(requirements!.targets.protein.min).toBe(8);
    expect(requirements!.targets.protein.max).toBe(10);
    expect(requirements!.targets.energy.min).toBe(1.8);
    expect(requirements!.targets.calcium.min).toBe(0.2);
    expect(requirements!.targets.phosphorus.min).toBe(0.15);
  });

  it("should convert energy units from Mcal to kcal accurately", () => {
    const result = convertEnergy(1, "Mcal", "kcal");

    expect(result.value).toBe(1000);
    expect(result.fromUnit).toBe("Mcal");
    expect(result.toUnit).toBe("kcal");
  });
});