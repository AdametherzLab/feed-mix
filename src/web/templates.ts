import type { RationResult } from '../types.js';

/**
 * Render the main HTML page with the ration formulation UI.
 * @returns Complete HTML document string.
 */
export function renderMainPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Feed Mix Calculator</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 2rem;
            background: #f5f5f5;
        }
        h1 { color: #2c3e50; margin-bottom: 0.5rem; }
        .subtitle { color: #666; margin-bottom: 2rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        .card { 
            background: white;
            border-radius: 8px; 
            padding: 1.5rem; 
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .form-group { margin-bottom: 1rem; }
        label { 
            display: block; 
            font-weight: 600; 
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
            color: #374151;
        }
        input, select { 
            width: 100%; 
            padding: 0.5rem; 
            border: 1px solid #d1d5db; 
            border-radius: 4px;
            font-size: 0.875rem;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #3b82f6;
        }
        .btn { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 0.75rem 1.5rem; 
            border-radius: 4px; 
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s;
        }
        .btn:hover { background: #2563eb; }
        .btn-secondary {
            background: #6b7280;
        }
        .btn-secondary:hover { background: #4b5563; }
        .btn-small {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
        }
        .ingredient-row { 
            display: grid; 
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr auto; 
            gap: 0.5rem; 
            align-items: end; 
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background: #f9fafb;
            border-radius: 4px;
        }
        .ingredient-row input {
            font-size: 0.75rem;
        }
        .result-feasible { color: #059669; font-weight: 600; }
        .result-infeasible { color: #dc2626; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { 
            text-align: left; 
            padding: 0.75rem; 
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.875rem;
        }
        th { 
            background: #f9fafb; 
            font-weight: 600;
            color: #374151;
        }
        .chart-container { 
            height: 300px; 
            margin-top: 1rem;
            position: relative;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin: 1rem 0;
        }
        .stat-box {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 4px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
        }
        .violation {
            background: #fee2e2;
            border-left: 4px solid #dc2626;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        .preset-btn {
            margin-right: 0.5rem;
            margin-bottom: 0.5rem;
        }
    </style>
</head>
<body>
    <h1>🌾 Feed Mix Calculator</h1>
    <p class="subtitle">Balance animal feed rations by nutrient targets with least-cost optimization</p>
    
    <div class="grid">
        <div>
            <div class="card">
                <h3>Ingredients</h3>
                <p style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">
                    Add ingredients with their nutritional values (per kg)
                </p>
                <div style="margin-bottom: 1rem;">
                    <span style="font-size: 0.875rem; font-weight: 600;">Quick add:</span>
                    <button class="btn btn-secondary btn-small preset-btn" onclick="addPreset('corn')">Corn</button>
                    <button class="btn btn-secondary btn-small preset-btn" onclick="addPreset('soy')">Soybean Meal</button>
                    <button class="btn btn-secondary btn-small preset-btn" onclick="addPreset('wheat')">Wheat</button>
                    <button class="btn btn-secondary btn-small preset-btn" onclick="addPreset('lime')">Limestone</button>
                </div>
                <div id="ingredient-list">
                </div>
                <button class="btn btn-secondary" onclick="addIngredientRow()" style="margin-top: 0.5rem;">
                    + Add Custom Ingredient
                </button>
            </div>
            
            <div class="card">
                <h3>Nutrient Targets</h3>
                <form id="formulate-form" onsubmit="handleSubmit(event)">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Species/Stage</label>
                            <select name="speciesId" id="species-select" required>
                                <option value="broiler-starter">Broiler Starter</option>
                                <option value="broiler-grower">Broiler Grower</option>
                                <option value="layer">Layer</option>
                                <option value="cattle-maintenance">Cattle Maintenance</option>
                                <option value="cattle-growing">Cattle Growing</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Total Batch (kg)</label>
                            <input type="number" id="batch-size" value="1000" min="1" step="100">
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem;">
                        <label style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">Protein (%)</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <input type="number" name="minCrudeProtein" id="min-protein" step="0.1" value="20" placeholder="Min" required>
                            </div>
                            <div class="form-group">
                                <input type="number" name="maxCrudeProtein" id="max-protein" step="0.1" value="24" placeholder="Max">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.5rem;">
                        <label style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">Energy (kcal/kg)</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <input type="number" name="minEnergy" id="min-energy" step="10" value="3000" placeholder="Min" required>
                            </div>
                            <div class="form-group">
                                <input type="number" name="maxEnergy" id="max-energy" step="10" value="3300" placeholder="Max">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.5rem;">
                        <label style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">Calcium (%)</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <input type="number" name="minCalcium" id="min-calcium" step="0.1" value="0.9" placeholder="Min" required>
                            </div>
                            <div class="form-group">
                                <input type="number" name="maxCalcium" id="max-calcium" step="0.1" value="1.2" placeholder="Max">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.5rem;">
                        <label style="font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600;">Phosphorus (%)</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div class="form-group">
                                <input type="number" name="minPhosphorus" id="min-phosphorus" step="0.1" value="0.45" placeholder="Min" required>
                            </div>
                            <div class="form-group">
                                <input type="number" name="maxPhosphorus" id="max-phosphorus" step="0.1" value="0.55" placeholder="Max">
                            </div>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn" style="margin-top: 1rem; width: 100%;">
                        Calculate Optimal Ration
                    </button>
                </form>
            </div>
        </div>
        
        <div id="results-container">
            <div class="card">
                <h3>Results</h3>
                <p style="color: #6b7280; text-align: center; padding: 2rem;">
                    Configure ingredients and targets, then click "Calculate Optimal Ration" to see results.
                </p>
            </div>
        </div>
    </div>
    
    <script>
        const presets = {
            corn: { name: 'Yellow Corn', cost: 0.25, protein: 8.5, energy: 3350, calcium: 0.02, phosphorus: 0.28 },
            soy: { name: 'Soybean Meal 48%', cost: 0.45, protein: 48, energy: 2200, calcium: 0.25, phosphorus: 0.65 },
            wheat: { name: 'Wheat Middlings', cost: 0.18, protein: 16.5, energy: 2800, calcium: 0.12, phosphorus: 0.9 },
            lime: { name: 'Limestone', cost: 0.05, protein: 0, energy: 0, calcium: 38, phosphorus: 0.02 }
        };
        
        const speciesPresets = {
            'broiler-starter': { protein: [21, 24], energy: [3000, 3300], calcium: [0.9, 1.1], phosphorus: [0.45, 0.55] },
            'broiler-grower': { protein: [19, 22], energy: [3100, 3400], calcium: [0.8, 1.0], phosphorus: [0.4, 0.5] },
            'layer': { protein: [16, 18], energy: [2800, 3000], calcium: [3.5, 4.0], phosphorus: [0.3, 0.4] },
            'cattle-maintenance': { protein: [8, 10], energy: [1800, 2200], calcium: [0.2, 0.4], phosphorus: [0.15, 0.25] },
            'cattle-growing': { protein: [12, 14], energy: [2000, 2400], calcium: [0.4, 0.6], phosphorus: [0.25, 0.35] }
        };
        
        document.getElementById('species-select').addEventListener('change', function(e) {
            const preset = speciesPresets[e.target.value];
            if (preset) {
                document.getElementById('min-protein').value = preset.protein[0];
                document.getElementById('max-protein').value = preset.protein[1];
                document.getElementById('min-energy').value = preset.energy[0];
                document.getElementById('max-energy').value = preset.energy[1];
                document.getElementById('min-calcium').value = preset.calcium[0];
                document.getElementById('max-calcium').value = preset.calcium[1];
                document.getElementById('min-phosphorus').value = preset.phosphorus[0];
                document.getElementById('max-phosphorus').value = preset.phosphorus[1];
            }
        });
        
        function addIngredientRow(data) {
            data = data || {};
            const container = document.getElementById('ingredient-list');
            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = '<input type="text" placeholder="Name" class="ing-name" value="' + (data.name || '') + '" required>' +
                '<input type="number" placeholder="Cost/kg" class="ing-cost" step="0.01" min="0" value="' + (data.cost || '') + '" required>' +
                '<input type="number" placeholder="Protein %" class="ing-protein" step="0.1" min="0" max="100" value="' + (data.protein || '') + '" required>' +
                '<input type="number" placeholder="Energy" class="ing-energy" step="10" min="0" value="' + (data.energy || '') + '" required>' +
                '<input type="number" placeholder="Ca %" class="ing-calcium" step="0.1" min="0" max="100" value="' + (data.calcium || '') + '" required>' +
                '<input type="number" placeholder="P %" class="ing-phosphorus" step="0.1" min="0" max="100" value="' + (data.phosphorus || '') + '" required>' +
                '<button type="button" class="btn btn-secondary btn-small" onclick="this.parentElement.remove()">×</button>';
            container.appendChild(row);
        }
        
        function addPreset(key) {
            const p = presets[key];
            addIngredientRow({ name: p.name, cost: p.cost, protein: p.protein, energy: p.energy, calcium: p.calcium, phosphorus: p.phosphorus });
        }
        
        async function handleSubmit(e) {
            e.preventDefault();
            const rows = document.querySelectorAll('.ingredient-row');
            const ingredients = [];
            rows.forEach(function(row, idx) {
                const name = row.querySelector('.ing-name').value;
                if (name) {
                    ingredients.push({
                        id: 'ing-' + idx,
                        name: name,
                        costPerUnit: parseFloat(row.querySelector('.ing-cost').value) || 0,
                        nutrients: {
                            crudeProtein: parseFloat(row.querySelector('.ing-protein').value) || 0,
                            energy: parseFloat(row.querySelector('.ing-energy').value) || 0,
                            calcium: parseFloat(row.querySelector('.ing-calcium').value) || 0,
                            phosphorus: parseFloat(row.querySelector('.ing-phosphorus').value) || 0
                        }
                    });
                }
            });
            
            if (ingredients.length === 0) {
                alert('Please add at least one ingredient');
                return;
            }
            
            const formData = new FormData(e.target);
            const requirements = {
                speciesId: formData.get('speciesId'),
                speciesName: formData.get('speciesId'),
                minCrudeProtein: parseFloat(formData.get('minCrudeProtein')),
                maxCrudeProtein: parseFloat(formData.get('maxCrudeProtein')) || undefined,
                minEnergy: parseFloat(formData.get('minEnergy')),
                maxEnergy: parseFloat(formData.get('maxEnergy')) || undefined,
                minCalcium: parseFloat(formData.get('minCalcium')),
                maxCalcium: parseFloat(formData.get('maxCalcium')) || undefined,
                minPhosphorus: parseFloat(formData.get('minPhosphorus')),
                maxPhosphorus: parseFloat(formData.get('maxPhosphorus')) || undefined
            };
            
            try {
                const response = await fetch('/api/formulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ingredients, requirements })
                });
                
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Calculation failed');
                }
                
                const html = await response.text();
                document.getElementById('results-container').innerHTML = html;
            } catch (err) {
                alert('Error: ' + err.message);
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Render an empty ingredient row for HTMX dynamic addition.
 * @returns HTML string for an ingredient input row.
 */
export function renderIngredientRow(): string {
  return `<div class="ingredient-row">
    <input type="text" placeholder="Name" class="ing-name" required>
    <input type="number" placeholder="Cost/kg" class="ing-cost" step="0.01" min="0" required>
    <input type="number" placeholder="Protein %" class="ing-protein" step="0.1" min="0" max="100" required>
    <input type="number" placeholder="Energy" class="ing-energy" step="10" min="0" required>
    <input type="number" placeholder="Ca %" class="ing-calcium" step="0.1" min="0" max="100" required>
    <input type="number" placeholder="P %" class="ing-phosphorus" step="0.1" min="0" max="100" required>
    <button type="button" class="btn btn-secondary btn-small" onclick="this.parentElement.remove()">×</button>
  </div>`;
}

/**
 * Render the results panel with ration analysis and charts.
 * @param result - The ration calculation result.
 * @returns HTML string for the results panel.
 */
export function renderResults(result: RationResult): string {
  const feasibleClass = result.isFeasible ? 'result-feasible' : 'result-infeasible';
  const feasibleText = result.isFeasible ? '✓ Feasible Solution' : '✗ Infeasible - Constraints Violated';
  
  let violationsHtml = '';
  if (result.constraintViolations && result.constraintViolations.length > 0) {
    violationsHtml = `<div style="margin-top: 1rem;">
      <h4>Constraint Violations</h4>
      ${result.constraintViolations.map(v => `
        <div class="violation">
          <strong>${v.type}</strong>: ${v.message}
        </div>
      `).join('')}
    </div>`;
  }
  
  const mixRows = result.mix.map(m => `
    <tr>
      <td>${m.ingredientId}</td>
      <td>${m.inclusionPercent.toFixed(2)}%</td>
      <td>$${m.costContribution.toFixed(4)}</td>
    </tr>
  `).join('');
  
  return `<div class="card">
    <h3>Formulation Results</h3>
    <div class="${feasibleClass}" style="margin-bottom: 1rem; padding: 0.75rem; background: ${result.isFeasible ? '#d1fae5' : '#fee2e2'}; border-radius: 4px;">
      ${feasibleText}
    </div>
    
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">$${result.totalCostPerUnit.toFixed(3)}</div>
        <div class="stat-label">Cost per kg</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${result.analysis.crudeProtein.toFixed(2)}%</div>
        <div class="stat-label">Protein</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${result.analysis.energy.toFixed(0)}</div>
        <div class="stat-label">Energy kcal/kg</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${result.analysis.calcium.toFixed(2)}%</div>
        <div class="stat-label">Calcium</div>
      </div>
    </div>
    
    <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">Ingredient Mix</h4>
    <table>
      <thead>
        <tr>
          <th>Ingredient</th>
          <th>Inclusion</th>
          <th>Cost Contribution</th>
        </tr>
      </thead>
      <tbody>
        ${mixRows}
      </tbody>
    </table>
    
    ${violationsHtml}
    
    <div class="chart-container">
      <canvas id="mixChart"></canvas>
    </div>
    
    <script>
      (function() {
        const ctx = document.getElementById('mixChart');
        if (!ctx) return;
        
        const mixData = ${JSON.stringify(result.mix.map(m => ({ name: m.ingredientId, pct: m.inclusionPercent })))};
        
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: mixData.map(d => d.name),
            datasets: [{
              data: mixData.map(d => d.pct),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: 'Ration Composition' },
              legend: { position: 'right' }
            }
          }
        });
      })();
    </script>
  </div>`;
}