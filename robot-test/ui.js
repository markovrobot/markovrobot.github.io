import { STATES } from './markov.js';

export class RobotUI {
    constructor(onPauseToggle, onSpeedChange) {
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '20px';
        this.container.style.left = '20px';
        this.container.style.padding = '15px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.borderRadius = '5px';
        this.container.style.width = '300px';
        this.container.style.zIndex = '1000';

        // state and energy Elements
        this.stateElement = document.createElement('div');
        this.stateElement.style.minHeight = '20px';
        this.stateElement.style.marginBottom = '10px';

        this.energyElement = document.createElement('div');
        this.energyElement.style.minHeight = '20px';
        this.energyElement.style.marginBottom = '5px';

        this.probabilitiesElement = document.createElement('div');
        this.probabilitiesElement.style.minHeight = '150px';
        this.probabilitiesElement.style.overflowY = 'auto';
        this.probabilitiesElement.style.fontFamily = 'monospace';

        // energy bar
        this.energyBarContainer = document.createElement('div');
        this.energyBarContainer.style.width = '100%';
        this.energyBarContainer.style.height = '20px';
        this.energyBarContainer.style.backgroundColor = '#333';
        this.energyBarContainer.style.marginTop = '5px';
        this.energyBarContainer.style.marginBottom = '10px';
        this.energyBarContainer.style.borderRadius = '3px';

        this.energyBar = document.createElement('div');
        this.energyBar.style.height = '100%';
        this.energyBar.style.backgroundColor = '#4CAF50';
        this.energyBar.style.width = '100%';
        this.energyBar.style.borderRadius = '3px';
        this.energyBar.style.transition = 'width 0.3s ease-in-out';

        this.energyBarContainer.appendChild(this.energyBar);

        // orb Counter
        this.orbCounterElement = document.createElement('div');
        this.orbCounterElement.style.marginTop = '10px';
        this.orbCounterElement.style.marginBottom = '10px';
        this.orbCounterElement.style.padding = '5px';
        this.orbCounterElement.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
        this.orbCounterElement.style.borderRadius = '3px';
        this.orbCounterElement.style.minHeight = '20px';

        // controls Container
        this.controlsContainer = document.createElement('div');
        this.controlsContainer.style.marginTop = '15px';
        this.controlsContainer.style.padding = '10px';
        this.controlsContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.controlsContainer.style.borderRadius = '3px';

        // pause Button
        this.pauseButton = document.createElement('button');
        this.pauseButton.innerHTML = '⏸️ Pause';
        this.pauseButton.style.padding = '5px 10px';
        this.pauseButton.style.marginRight = '10px';
        this.pauseButton.style.backgroundColor = '#4CAF50';
        this.pauseButton.style.border = 'none';
        this.pauseButton.style.borderRadius = '3px';
        this.pauseButton.style.color = 'white';
        this.pauseButton.style.cursor = 'pointer';
        this.pauseButton.style.width = '80px';
        this.pauseButton.addEventListener('click', () => {
            const isPaused = this.pauseButton.innerHTML.includes('Play');
            this.pauseButton.innerHTML = isPaused ? '⏸️ Pause' : '▶️ Play';
            this.pauseButton.style.backgroundColor = isPaused ? '#4CAF50' : '#FFA500';
            onPauseToggle();
        });

        // speed Control
        this.speedControlContainer = document.createElement('div');
        this.speedControlContainer.style.marginTop = '10px';

        this.speedLabel = document.createElement('div');
        this.speedLabel.innerHTML = 'Simulation Speed: 1x';
        this.speedLabel.style.marginBottom = '5px';

        this.speedSlider = document.createElement('input');
        this.speedSlider.type = 'range';
        this.speedSlider.min = '0.1';
        this.speedSlider.max = '3';
        this.speedSlider.step = '0.1';
        this.speedSlider.value = '1';
        this.speedSlider.style.width = '100%';
        this.speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.speedLabel.innerHTML = `Simulation Speed: ${speed.toFixed(1)}x`;
            onSpeedChange(speed);
        });

        // add everything to the container
        this.speedControlContainer.appendChild(this.speedLabel);
        this.speedControlContainer.appendChild(this.speedSlider);
        this.controlsContainer.appendChild(this.pauseButton);
        this.controlsContainer.appendChild(this.speedControlContainer);

        this.container.appendChild(this.stateElement);
        this.container.appendChild(this.energyElement);
        this.container.appendChild(this.energyBarContainer);
        this.container.appendChild(this.orbCounterElement);
        this.container.appendChild(this.probabilitiesElement);
        this.container.appendChild(this.controlsContainer);

        document.body.appendChild(this.container);
    }

    updateState(state) {
        let stateName = state;
        if (typeof state === 'number') {
            stateName = Object.keys(STATES).find(key => STATES[key] === state) || state;
        }
        this.stateElement.innerHTML = `<strong>Current State:</strong> ${stateName}`;
    }

    updateEnergy(energy) {
        this.energyElement.innerHTML = `<strong>Energy:</strong> ${energy}%`;
        this.energyBar.style.width = `${energy}%`;

        if (energy > 60) {
            this.energyBar.style.backgroundColor = '#4CAF50';
        } else if (energy > 30) {
            this.energyBar.style.backgroundColor = '#FFA500';
        } else {
            this.energyBar.style.backgroundColor = '#F44336';
        }
    }

    updateProbabilities(probabilities) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderSpacing = '5px';

        const probabilityEntries = probabilities
            .map((prob, i) => [i, prob])
            .filter(([_, value]) => value > 0)
            .map(([stateIndex, prob]) => {
                const row = document.createElement('tr');
                const stateCell = document.createElement('td');
                const probCell = document.createElement('td');

                const stateName = Object.keys(STATES).find(key => STATES[key] === parseInt(stateIndex)) || stateIndex;

                stateCell.textContent = stateName;
                probCell.textContent = `${(prob * 100).toFixed(1)}%`;
                probCell.style.textAlign = 'right';
                row.appendChild(stateCell);
                row.appendChild(probCell);
                return row;
            });

        probabilityEntries.forEach(row => table.appendChild(row));

        this.probabilitiesElement.innerHTML = '<br><strong>Transition Probabilities:</strong><br>';
        this.probabilitiesElement.appendChild(table);
    }

    updateOrbCount(count) {
        this.orbCounterElement.innerHTML = `<strong>Orbs Collected:</strong> ${count}`;
    }
}
