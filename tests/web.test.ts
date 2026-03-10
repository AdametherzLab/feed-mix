import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createServer } from '../src/web/server.js';
import type { Hono } from 'hono';

describe('Feed Mix Web UI', () => {
  let app: Hono;
  let server: ReturnType<typeof Bun.serve>;

  beforeAll(() => {
    app = createServer();
    server = Bun.serve({
      fetch: app.fetch,
      port: 0
    });
  });

  afterAll(() => {
    server.stop();
  });

  it('should serve the main page with HTML content', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Feed Mix Calculator');
    expect(text).toContain('htmx.org');
    expect(text).toContain('chart.js');
  });

  it('should return predefined ingredients via API', async () => {
    const res = await app.request('/api/ingredients');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty('id');
    expect(json[0]).toHaveProperty('name');
    expect(json[0]).toHaveProperty('nutrients');
  });

  it('should calculate ration formulation via API', async () => {
    const payload = {
      ingredients: [
        {
          id: 'corn',
          name: 'Yellow Corn',
          costPerUnit: 0.25,
          nutrients: { crudeProtein: 8.5, energy: 3350, calcium: 0.02, phosphorus: 0.28 }
        },
        {
          id: 'soy',
          name: 'Soybean Meal',
          costPerUnit: 0.45,
          nutrients: { crudeProtein: 48, energy: 2200, calcium: 0.25, phosphorus: 0.65 }
        }
      ],
      requirements: {
        speciesId: 'broiler-starter',
        speciesName: 'Broiler Starter',
        minCrudeProtein: 20,
        maxCrudeProtein: 24,
        minEnergy: 3000,
        maxEnergy: 3300,
        minCalcium: 0.9,
        maxCalcium: 1.1,
        minPhosphorus: 0.45,
        maxPhosphorus: 0.55
      }
    };

    const res = await app.request('/api/formulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Formulation Results');
    expect(text).toContain('Cost per kg');
    expect(text).toContain('mixChart');
  });

  it('should handle validation errors for invalid input', async () => {
    const payload = {
      ingredients: [],
      requirements: {
        speciesId: 'test',
        speciesName: 'Test',
        minCrudeProtein: -5
      }
    };

    const res = await app.request('/api/formulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toBe('Validation failed');
  });

  it('should provide ingredient row template', async () => {
    const res = await app.request('/api/ingredient-row');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('ingredient-row');
    expect(text).toContain('ing-name');
  });
});