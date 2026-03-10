# feed-mix 🌾

[![CI](https://github.com/AdametherzLab/feed-mix/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/feed-mix/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

TypeScript-powered feed formulation engine that balances rations for any species while keeping your wallet happy. Calculate least-cost mixes that hit protein, energy, calcium, and phosphorus targets without the spreadsheet headaches.

## Features

- ✅ **Least-cost optimization** — Greedy proportional allocation finds the cheapest feasible mix
- ✅ **Multi-species support** — From broilers to beef cattle, configure requirements for any production stage
- ✅ **Constraint handling** — Set min/max inclusion rates per ingredient to keep formulations practical
- ✅ **Zero dependencies** — Pure TypeScript with only Node.js/Bun built-ins
- ✅ **Fully typed** — Strict TypeScript interfaces for all inputs and outputs
- 📚 **Pre-defined Ingredient Database** — Quickly include common feedstuffs like corn, soybean meal, and limestone without manual data entry

## Installation

bash
npm install feed-mix
# or
bun add feed-mix


## Usage

### Basic Formulation


import { balanceRation, createIngredientId } from 'feed-mix';
import type { Ingredient } from 'feed-mix';

const corn: Ingredient = {
  id: createIngredientId('corn'),
  name: 'Yellow Corn',
  costPerUnit: 0.25,
  nutrients: {
    crudeProtein: 8.5,
    energy: 3350,
    calcium: 0.02,
    phosphorus: 0.28
  }
};

const soybeanMeal: Ingredient = {
  id: createIngredientId('soy'),
  name: 'Soybean Meal',
  costPerUnit: 0.45,
  nutrients: {
    crudeProtein: 48.0,
    energy: 2200,
    calcium: 0.25,
    phosphorus: 0.65
  }
};

const result = balanceRation({
  availableIngredients: [corn, soybeanMeal],
  // ... configuration
});


### Using Predefined Ingredients


import { predefinedIngredients, balanceRation } from 'feed-mix';

// Use corn and soybean meal from predefined list
const result = balanceRation({
  availableIngredients: [
    predefinedIngredients.find(i => i.name === 'Yellow Corn')!,
    predefinedIngredients.find(i => i.name === 'Soybean Meal (48% CP)')!
  ],
  // ... other params
});


### Managing Custom Ingredients


import { loadCustomIngredients, saveCustomIngredients } from 'feed-mix';

// Save a new custom ingredient
const newIngredient = {
  id: 'my-custom-feed',
  name: 'Custom Feed Mix',
  costPerUnit: 0.32,
  nutrients: {
    crudeProtein: 18,
    energy: 2950,
    calcium: 1.2,
    phosphorus: 0.6
  }
};

await saveCustomIngredients([newIngredient]);

// Load existing custom ingredients
const customIngredients = await loadCustomIngredients();


## API Documentation

[View full API documentation](./docs/api.md)

## Contributing

Contributions welcome! Please open an issue first to discuss proposed changes.

## License

MIT © [AdametherzLab](https://github.com/AdametherzLab)
