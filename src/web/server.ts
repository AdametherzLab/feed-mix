import { Hono } from 'hono';
import { z } from 'zod';
import { balanceRation } from '../calculator.js';
import { predefinedIngredients } from '../ingredients.js';
import { renderMainPage, renderResults, renderIngredientRow } from './templates.js';
import type { RationFormulationInput, SpeciesRequirements, Ingredient } from '../types.js';

/**
 * Zod schema for validating formulation requests.
 */
const formulationSchema = z.object({
  ingredients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    costPerUnit: z.number().positive(),
    nutrients: z.object({
      crudeProtein: z.number().min(0).max(100),
      energy: z.number().positive(),
      calcium: z.number().min(0).max(100),
      phosphorus: z.number().min(0).max(100)
    })
  })).min(1),
  requirements: z.object({
    speciesId: z.string(),
    speciesName: z.string(),
    minCrudeProtein: z.number(),
    maxCrudeProtein: z.number().optional(),
    minEnergy: z.number(),
    maxEnergy: z.number().optional(),
    minCalcium: z.number(),
    maxCalcium: z.number().optional(),
    minPhosphorus: z.number(),
    maxPhosphorus: z.number().optional()
  }),
  config: z.object({
    allowInfeasible: z.boolean().optional()
  }).optional()
});

/**
 * Create and configure the Hono application for the Feed Mix web UI.
 * @returns Configured Hono app instance.
 */
export function createServer(): Hono {
  const app = new Hono();

  app.get('/', (c) => {
    return c.html(renderMainPage());
  });

  app.get('/api/ingredients', (c) => {
    return c.json(predefinedIngredients);
  });

  app.get('/api/ingredient-row', (c) => {
    return c.html(renderIngredientRow());
  });

  app.post('/api/formulate', async (c) => {
    try {
      const body = await c.req.json();
      const parsed = formulationSchema.parse(body);
      
      const input: RationFormulationInput = {
        availableIngredients: parsed.ingredients as Ingredient[],
        requirements: parsed.requirements as SpeciesRequirements,
        config: parsed.config
      };

      const result = balanceRation(input);
      return c.html(renderResults(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: error.errors }, 400);
      }
      return c.json({ error: 'Calculation failed', message: (error as Error).message }, 500);
    }
  });

  return app;
}

/**
 * Start the web server on the specified port.
 * @param port - Port number to listen on (default: 3000).
 */
export function startServer(port: number = 3000): void {
  const app = createServer();
  console.log(`🌾 Feed Mix server starting on http://localhost:${port}`);
  Bun.serve({
    fetch: app.fetch,
    port
  });
}