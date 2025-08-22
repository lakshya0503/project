(function() {
	'use strict';

	const featureConfig = [
		{
			id: 'income',
			label: 'Annual income (k$)',
			min: 20,
			max: 300,
			step: 1,
			defaultValue: 90,
			weight: 0.28,
			baseline: 70,
			format: v => `$${v}k`
		},
		{
			id: 'dti',
			label: 'Debt-to-income (%)',
			min: 0,
			max: 60,
			step: 1,
			defaultValue: 22,
			weight: -0.32,
			baseline: 28,
			format: v => `${v}%`
		},
		{
			id: 'history',
			label: 'Credit history (years)',
			min: 0,
			max: 30,
			step: 1,
			defaultValue: 6,
			weight: 0.20,
			baseline: 5,
			format: v => `${v}y`
		},
		{
			id: 'late',
			label: 'Late payments (last 2y)',
			min: 0,
			max: 10,
			step: 1,
			defaultValue: 1,
			weight: -0.26,
			baseline: 2,
			format: v => `${v}`
		},
		{
			id: 'employment',
			label: 'Employment stability (years)',
			min: 0,
			max: 20,
			step: 1,
			defaultValue: 3,
			weight: 0.22,
			baseline: 3,
			format: v => `${v}y`
		}
	];

	const thresholds = {
		approve: 70,
		review: 40
	};

	const dom = {
		controls: document.getElementById('feature-controls'),
		scoreNumber: document.getElementById('score-number'),
		decision: document.getElementById('decision-badge'),
		contribList: document.getElementById('contrib-list'),
		whyText: document.getElementById('why-text'),
		thresholds: document.getElementById('thresholds'),
		resetBtn: document.getElementById('reset-btn'),
		downloadBtn: document.getElementById('download-report'),
		themeToggle: document.getElementById('theme-toggle')
	};

	function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

	function normalizeValue(config, rawValue) {
		const { id, min, max } = config;
		const ratio = (rawValue - min) / (max - min);
		if (id === 'dti' || id === 'late') {
			return 1 - ratio; // lower is better for these features
		}
		return ratio; // higher is better for others
	}

	function normalizeBaseline(config) {
		return normalizeValue(config, config.baseline);
	}

	function computeScoreAndContributions(rawInputs) {
		let totalWeighted = 0;
		let totalWeightAbs = 0;
		const contributions = [];

		for (const config of featureConfig) {
			const rawValue = rawInputs[config.id];
			const normalized = normalizeValue(config, rawValue);
			const normalizedBaseline = normalizeBaseline(config);
			const delta = normalized - normalizedBaseline;
			const contribution = delta * config.weight * 100; // in points
			contributions.push({
				id: config.id,
				label: config.label,
				rawValue,
				normalized,
				normalizedBaseline,
				weight: config.weight,
				contribution
			});
			// Build a base score around baseline ~ 50
			totalWeighted += (normalized * config.weight);
			totalWeightAbs += Math.abs(config.weight);
		}

		// Scale the weighted sum into 0..100 around 50 baseline
		const weightedRatio = (totalWeighted / (totalWeightAbs || 1));
		const score = clamp(50 + weightedRatio * 50, 0, 100);
		return { score, contributions };
	}

	function renderControls(rawInputs) {
		dom.controls.innerHTML = '';
		for (const config of featureConfig) {
			const wrapper = document.createElement('div');
			wrapper.className = 'control';

			const row = document.createElement('div');
			row.className = 'row';

			const label = document.createElement('label');
			label.setAttribute('for', `input-${config.id}`);
			label.textContent = config.label;

			const valueEl = document.createElement('div');
			valueEl.className = 'value';
			valueEl.id = `value-${config.id}`;
			valueEl.textContent = config.format(rawInputs[config.id]);

			row.appendChild(label);
			row.appendChild(valueEl);

			const input = document.createElement('input');
			input.type = 'range';
			input.min = String(config.min);
			input.max = String(config.max);
			input.step = String(config.step);
			input.value = String(rawInputs[config.id]);
			input.id = `input-${config.id}`;
			input.addEventListener('input', () => {
				rawInputs[config.id] = Number(input.value);
				valueEl.textContent = config.format(rawInputs[config.id]);
				saveInputs(rawInputs);
				update(rawInputs);
			});

			wrapper.appendChild(row);
			wrapper.appendChild(input);
			dom.controls.appendChild(wrapper);
		}
	}

	function renderThresholds() {
		dom.thresholds.innerHTML = '';
		const items = [
			{ title: 'Approve', range: `≥ ${thresholds.approve}` },
			{ title: 'Review', range: `${thresholds.review}–${thresholds.approve - 1}` },
			{ title: 'Deny', range: `< ${thresholds.review}` }
		];
		for (const t of items) {
			const el = document.createElement('div');
			el.className = 'threshold';
			el.innerHTML = `<strong>${t.title}</strong> ${t.range}`;
			dom.thresholds.appendChild(el);
		}
	}

	function renderContributions(contributions) {
		dom.contribList.innerHTML = '';
		const maxAbs = Math.max(10, ...contributions.map(c => Math.abs(c.contribution)));
		for (const c of contributions) {
			const row = document.createElement('div');
			row.className = `contrib ${c.contribution >= 0 ? 'positive' : 'negative'}`;
			const name = document.createElement('div');
			name.className = 'name';
			name.textContent = c.label;
			const bar = document.createElement('div');
			bar.className = 'bar';
			const fill = document.createElement('div');
			fill.className = 'fill';
			const pct = (Math.abs(c.contribution) / maxAbs) * 50; // 0..50% each side from center
			fill.style.width = `${pct}%`;
			bar.appendChild(fill);
			const delta = document.createElement('div');
			delta.className = 'delta';
			delta.textContent = `${c.contribution >= 0 ? '+' : ''}${c.contribution.toFixed(1)}`;
			row.appendChild(name);
			row.appendChild(bar);
			row.appendChild(delta);
			dom.contribList.appendChild(row);
		}
	}

	function renderDecision(score) {
		dom.scoreNumber.textContent = score.toFixed(0);
		dom.decision.className = 'decision';
		if (score >= thresholds.approve) {
			dom.decision.classList.add('approve');
			dom.decision.textContent = 'APPROVE';
		} else if (score >= thresholds.review) {
			dom.decision.classList.add('review');
			dom.decision.textContent = 'REVIEW';
		} else {
			dom.decision.classList.add('deny');
			dom.decision.textContent = 'DENY';
		}
	}

	function renderWhyText(contributions) {
		const positives = contributions.filter(c => c.contribution > 0).sort((a,b) => b.contribution - a.contribution);
		const negatives = contributions.filter(c => c.contribution < 0).sort((a,b) => Math.abs(b.contribution) - Math.abs(a.contribution));
		const topPos = positives[0];
		const topNeg = negatives[0];
		let parts = [];
		if (topPos) parts.push(`${topPos.label.toLowerCase()} helped by +${topPos.contribution.toFixed(1)} points`);
		if (topNeg) parts.push(`${topNeg.label.toLowerCase()} reduced by ${topNeg.contribution.toFixed(1)} points`);
		dom.whyText.textContent = parts.length ? `Main drivers: ${parts.join('; ')}.` : 'Adjust inputs to see a personalized explanation.';
	}

	function saveInputs(rawInputs) {
		try { localStorage.setItem('atl.inputs', JSON.stringify(rawInputs)); } catch {}
	}
	function loadInputs() {
		try {
			const raw = localStorage.getItem('atl.inputs');
			if (raw) return JSON.parse(raw);
		} catch {}
		const defaults = {};
		for (const cfg of featureConfig) defaults[cfg.id] = cfg.defaultValue;
		return defaults;
	}

	function saveTheme(theme) {
		try { localStorage.setItem('atl.theme', theme); } catch {}
	}
	function loadTheme() {
		try { return localStorage.getItem('atl.theme'); } catch { return null; }
	}

	function setTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		dom.themeToggle.textContent = theme === 'dark' ? '🌞' : '🌙';
		saveTheme(theme);
	}

	function toggleTheme() {
		const current = document.documentElement.getAttribute('data-theme') || 'light';
		setTheme(current === 'light' ? 'dark' : 'light');
	}

	function generateReport(rawInputs, score, contributions) {
		const decision = score >= thresholds.approve ? 'APPROVE' : score >= thresholds.review ? 'REVIEW' : 'DENY';
		return {
			meta: {
				generatedAt: new Date().toISOString(),
				model: 'Linear scoring demo (not a real model)'
			},
			inputs: rawInputs,
			score: Number(score.toFixed(2)),
			decision,
			thresholds,
			contributions: contributions.map(c => ({
				id: c.id,
				label: c.label,
				rawValue: c.rawValue,
				contribution: Number(c.contribution.toFixed(2))
			})),
			plainEnglish: dom.whyText.textContent
		};
	}

	function download(filename, dataObj) {
		const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		URL.revokeObjectURL(url);
		document.body.removeChild(a);
	}

	function update(rawInputs) {
		const { score, contributions } = computeScoreAndContributions(rawInputs);
		renderDecision(score);
		renderContributions(contributions);
		renderWhyText(contributions);
		// stash last result for report
		update._last = { rawInputs, score, contributions };
	}

	document.addEventListener('DOMContentLoaded', () => {
		// Theme
		const storedTheme = loadTheme();
		setTheme(storedTheme === 'dark' ? 'dark' : 'light');
		dom.themeToggle.addEventListener('click', toggleTheme);

		// Thresholds static content
		renderThresholds();

		// Inputs
		const inputs = loadInputs();
		renderControls(inputs);
		update(inputs);

		// Reset
		dom.resetBtn.addEventListener('click', () => {
			const defaults = {};
			for (const cfg of featureConfig) defaults[cfg.id] = cfg.defaultValue;
			saveInputs(defaults);
			renderControls(defaults);
			update(defaults);
		});

		// Download report
		dom.downloadBtn.addEventListener('click', () => {
			const last = update._last;
			if (!last) return;
			const report = generateReport(last.rawInputs, last.score, last.contributions);
			download('transparency-report.json', report);
		});
	});
})();

