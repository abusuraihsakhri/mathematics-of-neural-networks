# Mathematics of Neural Networks

A seven-chapter, browser-based study guide to the linear algebra, calculus, and optimization underlying feed-forward neural networks and backpropagation. Includes interactive numerical and visual demonstrations. The source is plain HTML, CSS, and JavaScript; no build step or backend is required.

## Features

- Seven connected chapters, with derivations, diagrams, physical analogies, and self-check questions.
- Fourteen demonstrations, including neuron gradient descent, Jacobian deformation, gradient/contour plots, network-shape calculators, momentum simulations, backpropagation, and XOR training.
- Responsive layouts, light/dark themes, and progress indicators.
- Client-side calculations: interactive inputs are not submitted to a server.

## Chapters

| Chapter | Main content | Interactive examples |
| --- | --- | --- |
| [1. Foundations](chapters/01-foundations.html) | Composition, notation, matrix dimensions | Network architecture builder; audio mixer |
| [2. Matrix calculus](chapters/02-matrix-calculus.html) | Gradients, Jacobians, chain rule | Gradient/contour explorer; Jacobian deformer; gears |
| [3. Neural layers](chapters/03-networks-as-equations.html) | Affine maps, activations, forward pass | Activation explorer; hydraulic valve |
| [4. Single-neuron derivatives](chapters/04-neuron-derivatives.html) | Partial derivatives and local sensitivities | Chain-rule microscope; finite-difference probe |
| [5. Gradient descent](chapters/05-gradient-descent.html) | Learning rates, stability, momentum | One-dimensional descent; two-dimensional loss arena |
| [6. Backpropagation](chapters/06-backpropagation.html) | Reverse-mode differentiation; BP1–BP4 | Backpropagation stepper; XOR training |
| [7. Reference](chapters/07-reference.html) | Notation, formulas, tensor shapes | Parameter and shape calculator |

To begin, open [the course landing page](index.html), follow the chapter sequence, and adjust the controls alongside each derivation. The interactive models are educational examples, not a general-purpose training framework.

## Local use

Open `index.html` directly or serve the repository directory with:

```bash
python -m http.server 8000
```

Then navigate to `http://localhost:8000`.

No Node, Python package, or external runtime is needed to use the site. JavaScript must be enabled. Layouts target modern Chrome, Firefox, Safari, and Edge; comprehensive cross-browser testing has not been established.

### Dependencies and privacy

The site has no application package dependencies. **MathJax is fetched from jsDelivr**, and **optional fonts are fetched from Google Fonts**. Network access is required for MathJax to typeset mathematical expressions; numeric simulations otherwise run in the browser. Third-party font/CDN requests may expose standard connection metadata to their providers.

Theme preference is saved in the browser’s `localStorage`. The application has no user account, analytics service, upload endpoint, or persistent server-side data store in its source.

## Developer checks

With Node.js 22 or later:

```bash
node --check js/main.js
node --test tests/*.test.mjs
```

The tests check syntax, local assets and anchors, widget selectors, page initialization, common simulator actions, and selected mathematical edge cases. GitHub Actions runs these checks for pushes to `main` and pull requests.

## GitHub Pages

This static site is suitable for GitHub Pages. Configure **Settings → Pages → Deploy from branch → `main` → `/ (root)`**.

Expected Pages address (live availability not independently verified):
https://abusuraihsakhri.github.io/mathematics-of-neural-networks/

All CSS, JavaScript, image, and chapter links use paths compatible with repository-scoped GitHub Pages.

## License

[MIT](LICENSE).
