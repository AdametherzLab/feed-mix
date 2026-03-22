import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../src/web/server.js';
import type { Hono } from 'hono';
import { renderResults } from '../src/web/templates.js';
import { balanceRation } from '../src/calculator.js';
import { predefinedIngredients } from '../src/ingredients.js';

describe('Feed Mix Web UI Templates', () => {
  it('should render ingredient row with all fields', () => {
    const row = renderIngredientRow();
    expect(row).toInclude('ingredients[].name');
    expect(row).toInclude('ingredients[].costPerUnit');
    expect(row).toInclude('nutrients.crudeProtein');
    expect(row).toInclude('defaultConstraint.minInclusionPercent');
  });

  it('should render results with charts when feasible', () => {
    const mockResult: RationResult = {
      isFeasible: true,
      totalCostPerUnit: 0.32,
      mix: [
        { ingredientId: 'corn', inclusionPercent: 60, costContribution: 0.18 },
        { ingredientId: 'soy', inclusionPercent: 40, costContribution: 0.14 }
      ],
      analysis: {
        crudeProtein: 18.5,
        energy: 2800,
        calcium: 0.8,
        phosphorus: 0.4
      }
    };
    
    const html = renderResults(mockResult);
    expect(html).toInclude('mixChart');
    expect(html).toInclude('nutrientChart');
    expect(html).toInclude('$0.32/kg');
  });

  it('should show errors when formulation is infeasible', () => {
    const mockResult: RationResult = {
      isFeasible: false,
      totalCostPerUnit: 0,
      mix: [],
      analysis: { crudeProtein: 0, energy: 0, calcium: 0, phosphorus: 0 },
      constraintViolations: [
        { 
          type: 'protein-min',
          message: 'Protein 8% below minimum 16%',
          actualValue: 8,
          targetValue: 16
        }
      ]
    };
    
    const html = renderResults(mockResult);
    expect(html).toInclude('Constraint Violations');
    expect(html).toInclude('Protein 8% below minimum 16%');
  });
});
