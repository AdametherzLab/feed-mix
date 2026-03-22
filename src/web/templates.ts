import { type RationResult, type SpeciesRequirements, type Ingredient } from '../types.js';

export function renderMainPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Feed Mix Calculator</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        :root { font-family: system-ui, sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .grid { display: grid; gap: 1rem; }
        .ingredient-row { grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr auto; align-items: end; }
        .chart-container { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        input[type="number"] { width: 100%; }
        .error { color: red; margin-top: 0.5rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🌾 Feed Mix Calculator</h1>
        
        <form hx-post="/api/formulate" hx-target="#results" hx-swap="innerHTML">
          <div class="requirements-section">
            <h2>Nutritional Targets</h2>
            <div class="grid" style="grid-template-columns: repeat(4, 1fr); gap: 1rem;">
              <div>
                <label>Species</label>
                <input type="text" name="requirements.speciesName" required>
              </div>
              <div>
                <label>Min Protein (%)</label>
                <input type="number" name="requirements.minCrudeProtein" step="0.1" required>
              </div>
              <div>
                <label>Min Energy (kcal/kg)</label>
                <input type="number" name="requirements.minEnergy" required>
              </div>
              <div>
                <label>Min Calcium (%)</label>
                <input type="number" name="requirements.minCalcium" step="0.01" required>
              </div>
            </div>
          </div>

          <div class="ingredients-section">
            <h2>Ingredients</h2>
            <div id="ingredients-list" class="grid">
              ${renderIngredientRow()}
            </div>
            <button type="button" class="secondary"
                    hx-get="/api/ingredient-row"
                    hx-target="#ingredients-list"
                    hx-swap="beforeend">
              ➕ Add Ingredient
            </button>
          </div>

          <button type="submit">⚡ Calculate Least-Cost Mix</button>
        </form>

        <div id="results"></div>
      </div>
    </body>
    </html>
  `;
}

export function renderIngredientRow() {
  return `
    <div class="grid ingredient-row">
      <div>
        <label>Name</label>
        <input type="text" name="ingredients[].name" required>
      </div>
      <div>
        <label>Cost/kg (USD)</label>
        <input type="number" name="ingredients[].costPerUnit" step="0.01" min="0" required>
      </div>
      <div>
        <label>Protein (%)</label>
        <input type="number" name="ingredients[].nutrients.crudeProtein" step="0.1" min="0" required>
      </div>
      <div>
        <label>Energy (kcal/kg)</label>
        <input type="number" name="ingredients[].nutrients.energy" min="0" required>
      </div>
      <div>
        <label>Min %</label>
        <input type="number" name="ingredients[].defaultConstraint.minInclusionPercent" min="0" max="100" step="1">
      </div>
      <div>
        <label>Max %</label>
        <input type="number" name="ingredients[].defaultConstraint.maxInclusionPercent" min="0" max="100" step="1">
      </div>
      <div>
        <button type="button" onclick="this.closest('.ingredient-row').remove()">🗑️</button>
      </div>
    </div>
  `;
}

export function renderResults(result: RationResult) {
  const nutrientData = {
    labels: ['Protein', 'Energy', 'Calcium', 'Phosphorus'],
    targets: [
      result.analysis.crudeProtein,
      result.analysis.energy,
      result.analysis.calcium,
      result.analysis.phosphorus
    ]
  };

  return `
    <div class="results-section">
      <h2>Formulation Results ${result.isFeasible ? '✅' : '⚠️'}</h2>
      <p>Cost: $${result.totalCostPerUnit.toFixed(2)}/kg</p>

      ${!result.isFeasible ? `
        <div class="error">
          <h3>Constraint Violations:</h3>
          <ul>
            ${result.constraintViolations?.map(v => `<li>${v.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="chart-container">
        <div>
          <h3>Ingredient Mix</h3>
          <canvas id="mixChart" width="400" height="400"></canvas>
        </div>
        <div>
          <h3>Nutrient Analysis</h3>
          <canvas id="nutrientChart" width="400" height="400"></canvas>
        </div>
      </div>

      <script>
        // Pie chart for ingredient mix
        new Chart(document.getElementById('mixChart'), {
          type: 'pie',
          data: {
            labels: ${JSON.stringify(result.mix.map(i => i.ingredientId))},
            datasets: [{
              data: ${JSON.stringify(result.mix.map(i => i.inclusionPercent))},
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
          }
        });

        // Bar chart for nutrient analysis
        new Chart(document.getElementById('nutrientChart'), {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(nutrientData.labels)},
            datasets: [{
              label: 'Achieved Values',
              data: ${JSON.stringify(nutrientData.targets)},
              backgroundColor: '#4BC0C0'
            }]
          }
        });
      </script>
    </div>
  `;
}
