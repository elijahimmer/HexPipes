# Hex Pipes: Evolutionary Artificial Life Simulation

An evolutionary artificial life system where single-hex organisms extract energy from flowing colored resources through configurable pipe networks. Watch populations adapt and evolve in real-time as metabolic configurations compete for survival.

## 🎯 Core Concept

**Organisms** are single hexagons with **3 one-way pipes** that process colored resources (R, Y, G, C, B, M). Each pipe connects two of the hex's 6 sides, pulling resources in and pushing them out. Energy is gained from color conversions (larger color distances = more energy). When organisms reach 100 energy, they reproduce with mutations, creating evolutionary dynamics.

## ✨ Key Features

### Resource System
- **6-Color Diffusion Grid**: RGB primaries (Red, Green, Blue) + CMY secondaries (Cyan, Magenta, Yellow)
- **Edge Sources**: Grid edges constantly supply colors creating resource gradients
- **Euler Diffusion**: Stable 2-pass diffusion (k < 1/6) spreads resources across grid
- **Resource Decay**: Optional depletion over time (default: off)

### Organism Metabolism
- **Pipe Networks**: Each organism has 3 pipes connecting pairs of its 6 sides
- **Color Processing**:
  - Primaries (R, G, B): Pull single RGB channel
  - Secondaries (Y, C, M): Pull TWO channels (limited by minimum)
- **Chain Flow**: Organisms connect output→input forming metabolic chains
- **Energy Extraction**: Gained from color distance × flow × loss_rate
  - Distance 0 (same color): 0 energy
  - Distance 3 (opposite on wheel): maximum energy

### Flow Processing (2-Pass System)
1. **Trace & Calculate**: Follow each source pipe forward through chains, calculate desired flow
2. **Normalize & Apply**: Group by shared sources, scale when demand exceeds supply, apply flows and distribute energy

### Evolution Mechanics
- **Reproduction**: At 100+ energy, spawn mutated offspring nearby
  - **Priority 1**: Free space (no neighbors) within range 2-5 (scales with energy)
  - **Priority 2**: Adjacent placement IF all touching pipes match perfectly (color + direction)
- **Mutation** (5% chance each):
  - Input/output color changes
  - Connection toggles (inputConnect/outputConnect)
  - Pipe configuration swaps
  - 60° or 120° rotation of entire organism
- **Death Mechanics**:
  - Random death: 0.5% per tick (lightning bolt ⚡)
  - Starvation: 50% death chance if energy < 1% of reproduction threshold
- **Energy Decay**: 1% per tick (prevents infinite accumulation)

### Configuration Space
- **5,598,720 total configurations** (120 topologies × 46,656 color combinations)
- **933,192 unique** after accounting for 6-fold rotational symmetry
- **Evolutionary Graph Tracking**: Maps which configurations are visited during evolution
  - Organism ID: Canonical string encoding (e.g., "0R3B-1Y4G-2C5M")
  - Tracks total organisms created, unique configurations discovered
  - Visualizes top 60 most successful configurations with population counts

## 🎮 User Interface

### Real-Time Visualization
- **Hex Grid**: Colorful diffusion from edges (toggle R/G/B channels)
- **Organisms**: Black hexagons with colored curved pipes
- **Flow Indicators**:
  - Green intensity shows flow amount (toggle on/off)
  - Input: Filled circle (●) at pulling end
  - Output: Arrow triangle (▶) at pushing end
- **Top Organisms Display**: Shows 60 most populous configurations with counts

### Population Graphs
- **Population**: Total organisms + unique living configurations over time
- **Real-time Statistics**:
  - Total organisms ever created
  - Unique configurations discovered (all time)
  - Living organisms + unique configurations (current)
  - Max count of any single configuration
  - Max offspring from any parent

### Adjustable Parameters
All parameters adjustable via UI before reset:
- **Grid**: Radius (1-50), Cell Size (8-20)
- **Resources**: Diffusion rate (0-0.16), Pipe flow rate (0-1), Loss rate (0-1)
- **Evolution**: Reproduction threshold (50-1000), Mutation rate (0-100%), Death rate (0-1%), Starvation mechanics
- **Population**: Initial organisms (1-500)

## 🔬 Technical Implementation

### Architecture
- **HexGrid**: Manages grid state, diffusion, flow processing, organism lifecycle
- **Organism**: Pipe configuration, drawing, ID generation, reproduction, mutation
- **OrganismGraph**: Tracks all configurations ever seen, parent→offspring relationships, population dynamics
- **DataManager**: Population graphs, statistics display

### Axial Coordinates
- Flat-top hexagons with (q, r) coordinates
- 6 neighbors via direction offsets: `[(+1,0), (0,+1), (-1,+1), (-1,0), (0,-1), (+1,-1)]`
- Grid constraint: `max(|q|, |r|, |q+r|) ≤ radius`

### Flow Algorithm
**Source-Driven Processing** (efficient, processes each chain once):

1. **Identify Sources**: For each organism, find pipes pulling from external cells (no organism)
2. **Trace Forward**: Follow chain organism→organism until reaching external output
3. **Calculate Flow**: Available input resources × k_pipe (0-1 flow rate)
4. **Group by Source**: Chains sharing same input cell compete for resources
5. **Normalize**: If total demand > supply, scale all chains proportionally
6. **Apply & Energize**: Withdraw from input, deposit to output, distribute energy to chain organisms

### Adjacent Placement Rules
When offspring attempts adjacent placement, **ALL touching sides must match**:
- Matching pipe on opposite side
- Matching direction (input↔output)
- Matching color
- Both have connection flags enabled

If even one side mismatches → placement rejected. This ensures clean multi-organism networks.

## 📊 Evolutionary Dynamics

### What to Observe
- **Population Stability**: Does population reach equilibrium or oscillate?
- **Configuration Dominance**: Do certain pipe layouts dominate? Why?
- **Spatial Patterns**: How does position affect success (center vs edges)?
- **Niche Formation**: Do specialist (few colors) vs generalist (many colors) strategies emerge?
- **Innovation Rate**: How quickly do new configurations appear? Does it slow over time?
- **Lineage Tracking**: Follow parent→offspring chains in console logs

### Typical Behavior
- **Early Exploration** (ticks 0-5000): Rapid discovery of new configurations, population growth
- **Competition Phase** (ticks 5000-20000): Population stabilizes, dominant configurations emerge
- **Refinement** (ticks 20000+): Small incremental changes, established lineages

### Performance
- **Default Setup** (radius 25, 30 organisms): ~60 FPS, 1981 grid cells
- **Large Setup** (radius 40, 100 organisms): ~30 FPS, 5041 grid cells
- Scales well to 500+ organisms if you reduce `updatesPerDraw` or increase `reportingPeriod`

## 🚀 Quick Start

1. Open `index.html` in modern browser (Chrome/Firefox recommended)
2. Adjust parameters if desired (or use defaults)
3. Click "Reset Simulation"
4. Watch evolution unfold!

## 🎛️ Recommended Parameter Sets

### Fast Evolution (Testing)
```
gridRadius: 15
numOrganisms: 20
reproductionThreshold: 50
mutationRate: 0.1
deathRate: 0.01
k_pipe: 0.9
loss_rate: 0.1
```
Fast reproduction, high mutation, aggressive death = rapid turnover

### Slow & Stable (Observation)
```
gridRadius: 30
numOrganisms: 30
reproductionThreshold: 150
mutationRate: 0.02
deathRate: 0.001
k_pipe: 0.5
loss_rate: 0.03
```
Slow reproduction, low mutation, rare death = gradual adaptation

### Crowded Competition (Emergent Behavior)
```
gridRadius: 25
numOrganisms: 100
reproductionThreshold: 100
mutationRate: 0.05
deathRate: 0.005
starvationRate: 0.8
k_pipe: 0.75
```
High density forces competition, starvation pressure drives adaptation

## 🔧 Technical Details

### File Structure
- `index.html` - Main page with UI controls
- `main.js` - Initialization and reset logic
- `hexgrid.js` - Grid, diffusion, flow processing, organism lifecycle
- `organism.js` - Organism class, pipes, drawing, reproduction, mutation
- `organismgraph.js` - Configuration tracking, population statistics, visualization
- `datamanager.js` - Graphs and data collection
- `params.js` - All adjustable parameters
- `gameengine.js` - Framework (game loop, entity management)
- `graph.js` - Time-series graph visualization
- `util.js` - Helper functions
- `style.css` - UI styling

### Dependencies
- **Vanilla JavaScript** (ES6+)
- **HTML5 Canvas** for rendering
- **Socket.io** (optional) for database logging
- **Alea** Random number generator for seeded generation by Johannes Baagøe (`./alea.js`)
- No build step required!

## 🧬 Configuration Space Analysis

Run the Python scripts to explore the 933k configuration space:

```bash
python count_configs.py          # Enumerate and classify all configs
python visualize_configs.py      # Generate heatmaps of energy vs diversity
```

Creates visualizations showing:
- Topology distribution (5 categories based on pipe angles)
- Energy factor vs color diversity heatmap
- Most common configuration types

## 🎓 Research Applications

This simulation is designed for studying:
- **Evolutionary dynamics** in metabolic networks
- **Niche construction** through environmental modification
- **Configuration space exploration** vs exploitation
- **Emergent complexity** in resource processing
- **Phylogenetic patterns** in artificial life

### Data Export
Console logs track:
- Every reproduction event (parent→offspring IDs)
- Death events (natural vs starvation)
- Configuration first appearances
- Population milestones

Use browser DevTools to export console history for analysis.

## 🐛 Known Limitations

- **Single-hex only**: Multi-hex organisms not yet implemented (though infrastructure exists)
- **No speciation tracking**: Lineages not explicitly tracked (yet)
- **Memory growth**: Long runs (100k+ ticks) may slow down due to graph tracking
- **No serialization**: Can't save/load simulation state

## 🎨 Autofeeder (Experimental)

See `autofeeder.js` for a pre-designed 6-organism ring that creates a self-sustaining resource cycle. Perfect for testing flow mechanics without evolution.

## 📝 Citation

If you use this simulation in research, please cite:
```
Hex Pipes: An Evolutionary Artificial Life Simulation
Chris Marriott, University of Washington Tacoma, 2025
```

## 🤝 Contributing

This is a research/educational project. Feel free to fork and experiment! Some ideas:
- Multi-hex organism implementation
- Predator-prey dynamics
- Sexual reproduction (configuration mixing)
- Environmental gradients/perturbations
- Explicit fitness tracking
- Phylogenetic tree visualization

## 📄 License

Open source - use for research, education, or fun!

---

**Have fun watching artificial life evolve! 🌈🧬⚡**
