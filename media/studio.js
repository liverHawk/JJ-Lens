// Client side of JJ Lens Studio. The extension renders every region as HTML;
// this script swaps the regions in, switches tabs, and reports what the user
// does (clicks, drag & drop, form values) back to the extension.
(function () {
	const vscode = acquireVsCodeApi();
	const state = Object.assign({ tab: 'graph' }, vscode.getState());
	const byId = (id) => document.getElementById(id);
	const post = (message) => vscode.postMessage(message);

	/** Commit id of the selected graph row. */
	let selected;
	/** Commit id of the row being dragged. */
	let dragging;
	let toastTimer;

	// --- tabs -------------------------------------------------------------

	function showTab(tab, section) {
		state.tab = tab;
		vscode.setState(state);
		for (const panel of document.querySelectorAll('[data-tab-panel]')) {
			panel.hidden = panel.dataset.tabPanel !== tab;
		}
		for (const button of document.querySelectorAll('[data-tab]')) {
			button.classList.toggle('active', button.dataset.tab === tab);
		}
		if (section) {
			const target = byId(section) || byId(`sec-${section}`);
			if (target) {
				target.scrollIntoView({ block: 'start' });
				target.classList.add('flash');
				setTimeout(() => target.classList.remove('flash'), 1600);
			}
		}
	}

	// --- rendering --------------------------------------------------------

	/** Remembers what the user typed or ticked, so a refresh does not wipe it. */
	function keepInputs(region) {
		const kept = new Map();
		for (const input of region.querySelectorAll('[data-keep]')) {
			if (input.type === 'checkbox') {
				if (input.checked !== input.defaultChecked) {
					kept.set(input.dataset.keep, input.checked);
				}
			} else if (input.value !== input.defaultValue) {
				kept.set(input.dataset.keep, input.value);
			}
		}
		return () => {
			for (const input of region.querySelectorAll('[data-keep]')) {
				if (!kept.has(input.dataset.keep)) {
					continue;
				}
				if (input.type === 'checkbox') {
					input.checked = kept.get(input.dataset.keep);
				} else {
					input.value = kept.get(input.dataset.keep);
				}
			}
		};
	}

	function render(regions) {
		for (const [id, html] of Object.entries(regions)) {
			const region = byId(id);
			if (!region) {
				continue;
			}
			const restore = keepInputs(region);
			region.innerHTML = html;
			restore();
		}
		if ('header' in regions) {
			showTab(state.tab);
		}
		if ('graph' in regions) {
			selected = byId('graph').querySelector('.row.selected')?.dataset.id;
		}
	}

	function openModal(html) {
		const modal = byId('modal');
		modal.innerHTML = html;
		modal.hidden = false;
		modal.querySelector('button:not([disabled])')?.focus();
	}

	function closeModal() {
		const modal = byId('modal');
		modal.hidden = true;
		modal.innerHTML = '';
	}

	function toast(text) {
		const element = byId('toast');
		element.textContent = text;
		element.hidden = false;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (element.hidden = true), 5000);
	}

	window.addEventListener('message', ({ data }) => {
		switch (data.type) {
			case 'render':
				render(data.regions);
				break;
			case 'tab':
				showTab(data.tab, data.section);
				break;
			case 'modal':
				openModal(data.html);
				break;
			case 'toast':
				toast(data.text);
				break;
		}
	});

	// --- reporting clicks and forms ---------------------------------------

	/** Values of the named inputs inside a `[data-form]`; checkboxes become arrays. */
	function collect(form) {
		const values = {};
		for (const input of form.querySelectorAll('[name]')) {
			if (input.type === 'checkbox') {
				values[input.name] ??= [];
				if (input.checked) {
					values[input.name].push(input.value);
				}
			} else {
				values[input.name] = input.value;
			}
		}
		return values;
	}

	document.addEventListener('click', (event) => {
		const target = event.target instanceof Element ? event.target : undefined;
		if (!target) {
			return;
		}
		if (target.id === 'modal') {
			closeModal();
			return;
		}
		const tabButton = target.closest('[data-tab]');
		if (tabButton) {
			showTab(tabButton.dataset.tab);
			return;
		}
		const copyButton = target.closest('#cli-copy');
		if (copyButton) {
			post({ type: 'copy', text: byId('cli-command').textContent });
			toast(copyButton.dataset.copied);
			return;
		}
		const action = target.closest('[data-msg]');
		if (action) {
			const message = JSON.parse(action.dataset.msg);
			const form = action.closest('[data-form]');
			if (form) {
				message.form = collect(form);
			}
			if (action.hasAttribute('data-close')) {
				closeModal();
			}
			post(message);
			return;
		}
		if (target.closest('[data-close]')) {
			closeModal();
			return;
		}
		const row = target.closest('.row[data-id]');
		if (row) {
			const second = event.ctrlKey || event.metaKey || event.shiftKey;
			if (second && selected && selected !== row.dataset.id) {
				post({ type: 'pair', source: selected, target: row.dataset.id });
			} else {
				post({ type: 'select', id: row.dataset.id });
			}
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !byId('modal').hidden) {
			closeModal();
			return;
		}
		// Enter in a one-line form presses its button.
		if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type === 'text') {
			const form = event.target.closest('.filter, .inline-form');
			form?.querySelector('.btn[data-msg]')?.click();
		}
	});

	// --- drag a revision onto another --------------------------------------

	const clearDropTarget = () => document.querySelector('.row.drop-target')?.classList.remove('drop-target');

	document.addEventListener('dragstart', (event) => {
		const row = event.target instanceof Element ? event.target.closest('.row[data-id]') : undefined;
		if (!row) {
			return;
		}
		dragging = row.dataset.id;
		row.classList.add('dragging');
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', dragging);
	});

	document.addEventListener('dragover', (event) => {
		const row = event.target instanceof Element ? event.target.closest('.row[data-id]') : undefined;
		if (!dragging || !row || row.dataset.id === dragging) {
			clearDropTarget();
			return;
		}
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		if (!row.classList.contains('drop-target')) {
			clearDropTarget();
			row.classList.add('drop-target');
		}
	});

	document.addEventListener('drop', (event) => {
		const row = event.target instanceof Element ? event.target.closest('.row[data-id]') : undefined;
		if (dragging && row && row.dataset.id !== dragging) {
			event.preventDefault();
			post({ type: 'pair', source: dragging, target: row.dataset.id });
		}
	});

	document.addEventListener('dragend', () => {
		dragging = undefined;
		clearDropTarget();
		document.querySelector('.row.dragging')?.classList.remove('dragging');
	});

	// --- CLI learning bar ---------------------------------------------------

	document.addEventListener('mouseover', (event) => {
		const source = event.target instanceof Element ? event.target.closest('[data-cli]') : undefined;
		const command = byId('cli-command');
		if (!source || !command || command.textContent === source.dataset.cli) {
			return;
		}
		command.textContent = source.dataset.cli;
		command.hidden = false;
		byId('cli-copy').hidden = false;
		const notes = byId('cli-notes');
		notes.textContent = '';
		for (const text of (source.dataset.cliNotes || '').split('\n').filter(Boolean)) {
			const note = document.createElement('span');
			note.className = 'cli-note';
			note.textContent = text;
			notes.append(note);
		}
	});

	post({ type: 'ready' });
})();
