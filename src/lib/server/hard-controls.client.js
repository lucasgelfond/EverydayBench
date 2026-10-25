// @ts-nocheck: a plain browser script, served inline as written (not bundled), so it is checked by its browser tests.
// Hard controls (hard-controls.ts), on a hard twin's pages: they swap their plain form controls for the widgets real
// sites build instead. Each native control stays in its form, hidden from people and the accessibility tree, and the
// widget sets it, so a submit sends what it always did and grading doesn't change. Served inline by hooks.server.ts,
// with its config on the script tag; it re-runs as pages change (client navigation, re-renders).
(() => {
	const { on, today } = JSON.parse(document.currentScript.dataset.config);
	const has = (v) => on.includes(v);
	const css = document.createElement('style');
	css.textContent = `
.eb-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}
.eb-wrap{position:relative;display:block}
.eb-combo{text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:.5rem}
.eb-combo::after{content:'';border:solid currentColor;border-width:0 2px 2px 0;padding:3px;transform:rotate(45deg);opacity:.6}
.eb-pop{position:absolute;z-index:60;left:0;top:calc(100% + 4px);min-width:100%;background:var(--surface,#fff);color:var(--ink,#111);border:1px solid rgba(0,0,0,.18);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:4px}
.eb-list{max-height:7.5rem;overflow:auto}
.eb-opt{padding:.3rem .5rem;border-radius:4px;cursor:pointer;white-space:nowrap;font-size:.9rem}
.eb-opt:hover,.eb-opt:focus{background:rgba(0,0,0,.08);outline:none}
.eb-opt[aria-selected=true]{font-weight:600}
.eb-opt[aria-disabled=true]{opacity:.4;cursor:default}
.eb-cal{width:15.5rem}
.eb-cal header{display:flex;justify-content:space-between;align-items:center;padding:.25rem;font-weight:600;font-size:.85rem}
.eb-cal header button{width:1.6rem;height:1.6rem;border-radius:4px}
.eb-cal table{border-collapse:collapse;width:100%;font-size:.75rem}
.eb-cal th{font-weight:500;opacity:.6;padding:2px}
.eb-cal td{padding:1px;text-align:center}
.eb-cal td button{width:1.9rem;height:1.6rem;border-radius:4px}
.eb-cal td button:disabled{opacity:.3}
.eb-cal td button[aria-pressed=true]{background:var(--accent,#333);color:#fff}
.eb-step{display:inline-flex;align-items:center;gap:.25rem}
.eb-step button{width:1.4rem;height:1.4rem;border:1px solid rgba(0,0,0,.25);border-radius:50%;line-height:1;font-size:.8rem}
.eb-step output{min-width:1.5rem;text-align:center;font-size:.9rem}
.eb-range{position:relative;height:1.5rem;margin:.25rem .5rem;width:12rem;touch-action:none}
.eb-range::before{content:'';position:absolute;left:0;right:0;top:50%;height:3px;background:rgba(0,0,0,.2)}
.eb-range [role=slider]{position:absolute;top:50%;width:.9rem;height:.9rem;margin:-.45rem 0 0 -.45rem;border-radius:50%;background:var(--accent,#333);cursor:grab}
.eb-range output{position:absolute;right:-.5rem;top:-1rem;font-size:.75rem}
.eb-slide{position:relative;flex:none;width:min(22rem,100%);min-width:14rem;height:2.75rem;border-radius:999px;background:rgba(0,0,0,.08);margin:.5rem 0;overflow:hidden;touch-action:none;user-select:none;max-width:22rem}
.eb-slide-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:600;opacity:.7;pointer-events:none}
.eb-slide [role=slider]{position:absolute;left:3px;top:3px;width:2.4rem;height:2.4rem;border-radius:50%;background:var(--accent,#333);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab}
.eb-slide.eb-shake{animation:eb-shake .3s}
@keyframes eb-shake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.eb-icon{font-size:0!important;gap:0!important;min-width:2.25rem;min-height:2.25rem;padding-left:.5rem!important;padding-right:.5rem!important}
.eb-icon::before{content:'';display:inline-block;width:1.1rem;height:1.1rem;background:currentColor;-webkit-mask:var(--eb-icon) center/contain no-repeat;mask:var(--eb-icon) center/contain no-repeat}
.eb-banner{display:flex;gap:1rem;justify-content:space-between;align-items:center;padding:1.1rem 1.5rem;background:#fff4d6;color:#4a3800;font-size:.9rem;border-bottom:1px solid #e8d49a}
.eb-frame{display:block;width:100%;height:2.6rem;border:0}`;
	document.head.append(css);

	const el = (tag, attrs = {}, text) => {
		const e = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
		if (text !== undefined) e.textContent = text;
		return e;
	};
	// What the control's label says, without the text of the controls inside it.
	const labelOf = (c) => {
		const l = c.labels?.[0];
		if (!l) return c.getAttribute('aria-label') ?? c.name ?? '';
		const copy = l.cloneNode(true);
		copy.querySelectorAll('select,input,textarea,button,datalist,.eb-wrap,.eb-step,.eb-range,span.font-normal').forEach((n) => n.remove());
		return copy.textContent.replace(/\s+/g, ' ').trim();
	};
	// The native control's new value, as if the person had chosen it (Svelte's bindings and forms listen for these).
	const set = (c, v) => {
		c.value = v;
		c.dispatchEvent(new Event('input', { bubbles: true }));
		c.dispatchEvent(new Event('change', { bubbles: true }));
	};
	// Only when it changed: the page watcher would otherwise see every refresh as a change and refresh again.
	const text = (n, s) => n.textContent !== s && (n.textContent = s);
	const widgets = [];
	const hide = (c, kind, widget) => {
		c.dataset.eb = kind;
		c.classList.add('eb-native');
		c.setAttribute('aria-hidden', 'true');
		c.tabIndex = -1;
		c.after(widget);
		widgets.push([c, widget, () => c.after(widget)]);
	};
	let openPop;
	const closePop = () => {
		openPop?.remove();
		openPop?.owner.setAttribute('aria-expanded', 'false');
		openPop = undefined;
	};
	document.addEventListener('pointerdown', (e) => openPop && !openPop.contains(e.target) && !openPop.owner.contains(e.target) && closePop(), true);
	document.addEventListener('keydown', (e) => e.key === 'Escape' && openPop && (openPop.owner.focus(), closePop()));

	// A dropdown that isn't a <select>: a button, and a short scrolling list that exists only while it's open.
	function combo(c, options, current, choose, kind) {
		const wrap = el('span', { class: 'eb-wrap', 'data-eb-widget': kind });
		const label = labelOf(c);
		const btn = el('button', { type: 'button', class: 'field eb-combo', role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label });
		const show = () => text(btn, current() || 'Select…');
		show();
		btn.addEventListener('click', () => {
			if (openPop?.owner === btn) return closePop();
			closePop();
			const list = el('div', { class: 'eb-pop eb-list', role: 'listbox', 'aria-label': label });
			for (const o of options()) {
				const opt = el('div', { class: 'eb-opt', role: 'option', tabindex: '-1', 'data-value': o.value, 'aria-selected': String(o.selected) }, o.text);
				if (o.disabled) opt.setAttribute('aria-disabled', 'true');
				else opt.addEventListener('click', () => (choose(o.value), show(), closePop(), btn.focus()));
				list.append(opt);
			}
			list.addEventListener('keydown', (e) => {
				const opts = [...list.querySelectorAll('[role=option]:not([aria-disabled])')];
				const i = opts.indexOf(document.activeElement);
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') opts[Math.max(0, Math.min(opts.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
				else if (e.key === 'Enter' || e.key === ' ') document.activeElement?.click();
				else return;
				e.preventDefault();
			});
			list.owner = btn;
			wrap.append(list);
			openPop = list;
			btn.setAttribute('aria-expanded', 'true');
			(list.querySelector('[aria-selected=true]') ?? list.querySelector('[role=option]'))?.focus();
		});
		btn.addEventListener('keydown', (e) => e.key === 'ArrowDown' && (e.preventDefault(), btn.click()));
		wrap.sync = show;
		wrap.append(btn);
		hide(c, kind, wrap);
	}

	const selectBox = (s) =>
		combo(
			s,
			() => [...s.options].map((o) => ({ value: o.value, text: o.textContent.trim(), selected: o.selected, disabled: o.disabled })),
			() => s.selectedOptions[0]?.textContent.trim(),
			(v) => set(s, v),
			'select'
		);

	// Times as a list every 15 minutes (the way calendars offer them), not a field to type in.
	const clock = (v) => {
		const [h, m] = v.split(':').map(Number);
		return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
	};
	const timeBox = (t) =>
		combo(
			t,
			() => {
				const times = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
				if (t.value && !times.includes(t.value)) times.push(t.value), times.sort();
				return times.map((v) => ({ value: v, text: clock(v), selected: v === t.value }));
			},
			() => (t.value ? clock(t.value) : ''),
			(v) => set(t, v),
			'time'
		);

	// A date chosen from a calendar only: it opens on the chosen month (or the site's today), one month at a time.
	const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	const spoken = (v) => {
		const [y, m, d] = v.split('-').map(Number);
		return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${MONTHS[m - 1]} ${d}, ${y}`;
	};
	function datePicker(input) {
		const wrap = el('span', { class: 'eb-wrap', 'data-eb-widget': 'date' });
		const label = labelOf(input);
		const btn = el('button', { type: 'button', class: 'field eb-combo', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
		const show = () => {
			text(btn, input.value ? spoken(input.value) : 'Choose a date');
			btn.setAttribute('aria-label', `${label}: ${input.value ? spoken(input.value) : 'not chosen'}`);
		};
		show();
		btn.addEventListener('click', () => {
			if (openPop?.owner === btn) return closePop();
			closePop();
			const start = (input.value || input.min || today).split('-').map(Number);
			let y = start[0];
			let m = start[1] - 1;
			const pop = el('div', { class: 'eb-pop eb-cal', role: 'dialog', 'aria-label': `Choose ${label.toLowerCase()}` });
			const draw = () => {
				pop.replaceChildren();
				const head = el('header');
				const prev = el('button', { type: 'button', 'aria-label': 'Previous month' }, '‹');
				const next = el('button', { type: 'button', 'aria-label': 'Next month' }, '›');
				prev.onclick = () => ((m = (m + 11) % 12), m === 11 && y--, draw());
				next.onclick = () => ((m = (m + 1) % 12), m === 0 && y++, draw());
				head.append(prev, el('span', { 'aria-live': 'polite' }, `${MONTHS[m]} ${y}`), next);
				const table = el('table', { role: 'grid', 'aria-label': `${MONTHS[m]} ${y}` });
				const names = el('tr');
				for (const d of DAYS) names.append(el('th', { abbr: d }, d.slice(0, 2)));
				table.append(names);
				const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
				const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
				let row;
				for (let i = 0; i < first + count; i++) {
					if (i % 7 === 0) table.append((row = el('tr')));
					const cell = el('td');
					if (i >= first) {
						const v = iso(y, m, i - first + 1);
						const day = el('button', { type: 'button', 'aria-label': spoken(v), 'aria-pressed': String(v === input.value) }, String(i - first + 1));
						if ((input.min && v < input.min) || (input.max && v > input.max)) day.disabled = true;
						day.onclick = () => (set(input, v), show(), closePop(), btn.focus());
						cell.append(day);
					}
					row.append(cell);
				}
				pop.append(head, table);
			};
			draw();
			pop.owner = btn;
			wrap.append(pop);
			openPop = pop;
			btn.setAttribute('aria-expanded', 'true');
		});
		wrap.sync = show;
		wrap.append(btn);
		hide(input, 'date', wrap);
	}

	// A number set with − and + (a short range), or a slider (an open one, like a price cap: the far end means any).
	function numberControl(input) {
		const label = labelOf(input);
		const min = Number(input.min || 0);
		const step = Number(input.step) || 1;
		if (input.max && Number(input.max) - min <= 30) {
			const max = Number(input.max);
			const wrap = el('span', { class: 'eb-step', 'data-eb-widget': 'number' });
			const less = el('button', { type: 'button', 'aria-label': `Fewer: ${label}` }, '−');
			const out = el('output', { 'aria-label': label, 'aria-live': 'polite' });
			const more = el('button', { type: 'button', 'aria-label': `More: ${label}` }, '+');
			const show = () => text(out, input.value || '–');
			const by = (d) => set(input, String(Math.max(min, Math.min(max, (input.value === '' ? min - (d > 0 ? step : 0) : Number(input.value)) + d)))) || show();
			less.onclick = () => by(-step);
			more.onclick = () => by(step);
			show();
			wrap.sync = show;
			wrap.append(less, out, more);
			return hide(input, 'number', wrap);
		}
		const max = Number(input.max || 1000);
		const big = step * 5;
		const wrap = el('span', { class: 'eb-range', 'data-eb-widget': 'range' });
		const thumb = el('span', { role: 'slider', tabindex: '0', 'aria-label': label, 'aria-valuemin': String(min), 'aria-valuemax': String(max) });
		const out = el('output');
		const value = () => (input.value === '' ? max : Number(input.value));
		const show = () => {
			const v = value();
			thumb.style.left = `${((v - min) / (max - min)) * 100}%`;
			thumb.setAttribute('aria-valuenow', String(v));
			thumb.setAttribute('aria-valuetext', input.value === '' ? 'Any' : String(v));
			text(out, input.value === '' ? 'Any' : String(v));
		};
		const to = (v) => {
			const n = Math.max(min, Math.min(max, Math.round(v / step) * step));
			set(input, n >= max ? '' : String(n));
			show();
		};
		thumb.addEventListener('keydown', (e) => {
			const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big }[e.key];
			if (d) to(value() + d);
			else if (e.key === 'Home') to(min);
			else if (e.key === 'End') to(max);
			else return;
			e.preventDefault();
		});
		wrap.addEventListener('pointerdown', (e) => {
			const r = wrap.getBoundingClientRect();
			const move = (ev) => to(min + ((ev.clientX - r.left) / r.width) * (max - min));
			move(e);
			wrap.setPointerCapture(e.pointerId);
			wrap.onpointermove = move;
			wrap.onpointerup = () => (wrap.onpointermove = null);
		});
		show();
		wrap.sync = show;
		wrap.append(thumb, out);
		hide(input, 'range', wrap);
	}

	// Purchases and other buttons that do something for good take a slide to confirm first. The button stays (a click on
	// it alone shakes the slider); sliding all the way submits with it, as the click would have.
	const CONSEQUENTIAL = /^(pay|purchase|confirm|complete|place (your )?order|buy|book|reserve|check in|add credit|submit|send|request a refund|yes, cancel|cancel (my|for)|move me|keep seat|save event|delete|pause my plan)/i;
	const unlocked = new WeakSet();
	function slideGuard(b) {
		const text = b.textContent.replace(/\s+/g, ' ').trim();
		const track = el('div', { class: 'eb-slide', 'data-eb-widget': 'slide' });
		const thumb = el('span', { role: 'slider', tabindex: '0', 'aria-label': `Slide to confirm: ${text}`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, '→');
		track.append(el('span', { class: 'eb-slide-label' }, `Slide to confirm: ${text}`), thumb);
		const at = (p) => {
			const room = track.clientWidth - thumb.offsetWidth - 6;
			thumb.style.left = `${3 + room * p}px`;
			thumb.setAttribute('aria-valuenow', String(Math.round(p * 100)));
		};
		const done = () => {
			at(1);
			unlocked.add(b);
			b.form ? b.form.requestSubmit(b) : b.click();
			setTimeout(() => (unlocked.delete(b), at(0)), 1500);
		};
		thumb.addEventListener('pointerdown', (e) => {
			const x0 = e.clientX;
			const room = track.clientWidth - thumb.offsetWidth - 6;
			thumb.setPointerCapture(e.pointerId);
			thumb.onpointermove = (ev) => at(Math.max(0, Math.min(1, (ev.clientX - x0) / room)));
			thumb.onpointerup = (ev) => {
				thumb.onpointermove = null;
				(ev.clientX - x0) / room > 0.92 ? done() : at(0);
			};
		});
		thumb.addEventListener('keydown', (e) => {
			if (e.key === 'End') done();
			else if (e.key === 'ArrowRight') {
				const p = Number(thumb.getAttribute('aria-valuenow')) / 100 + 0.25;
				p >= 1 ? done() : at(p);
			} else return;
			e.preventDefault();
		});
		b.dataset.ebGuard = '1';
		b.before(track);
		widgets.push([b, track, () => b.before(track)]);
	}
	// Before any form handler, and before the slider is drawn (a quick click mustn't slip through): a consequential
	// button's click or submit does nothing until its slider has been slid.
	const guarded = (b) => b instanceof HTMLButtonElement && !!b.form && b.type === 'submit' && CONSEQUENTIAL.test(b.textContent.trim());
	const blocked = (b) => has('slide') && guarded(b) && !unlocked.has(b) && (b.dataset.ebGuard || enhance(), true);
	const shake = (b) => {
		const t = b.previousElementSibling;
		t?.classList.remove('eb-shake');
		void t?.offsetWidth;
		t?.classList.add('eb-shake');
	};
	window.addEventListener('submit', (e) => blocked(e.submitter) && (e.preventDefault(), e.stopImmediatePropagation(), shake(e.submitter)), true);

	// Buttons that show an icon, not their words (the words stay for screen readers; a tooltip on hover).
	const svg = (d) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'>${d}</svg>`)}")`;
	const ICONS = [
		[/^search/i, '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'],
		[/^(continue|next|find my trip|show times|check availability|check status|start over)/i, '<path d="M5 12h14M13 6l6 6-6 6"/>'],
		[/^sign in/i, '<path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>'],
		[/^sign out/i, '<path d="M14 17l5-5-5-5M19 12H7M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'],
		[/^(remove|delete)/i, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'],
		[/^(\+ ?)?add\b(?! credit)|^add to (cart|bag)/i, '<path d="M12 5v14M5 12h14"/>'],
		[/^(save|update|change password)/i, '<path d="M5 13l4 4L19 7"/>'],
		[/^(email me|send code)/i, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'],
		[/(to wishlist|from wishlist)$/i, '<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>']
	];
	function iconify(b) {
		if (b.dataset.ebGuard || b.closest('[data-eb-widget]')) return;
		const name = (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim();
		const hit = ICONS.find(([re]) => re.test(name));
		if (!hit) return;
		b.dataset.eb = 'icon';
		b.classList.add('eb-icon');
		b.style.setProperty('--eb-icon', svg(hit[1]));
		b.title = name;
	}

	// Card fields in a frame, the way hosted payment fields are: typing happens inside it.
	function framed(input) {
		const f = el('iframe', { class: 'eb-frame', title: `Secure ${labelOf(input).toLowerCase()} field`, 'data-eb-widget': 'frame' });
		f.srcdoc = `<!doctype html><style>body{margin:0}input{box-sizing:border-box;width:100%;height:2.5rem;padding:0 .6rem;font:inherit;font-size:15px;border:1px solid #bbb;border-radius:6px}</style><input aria-label="${labelOf(input).replace(/"/g, '')}" autocomplete="${input.autocomplete}" placeholder="${input.placeholder.replace(/"/g, '')}" inputmode="${input.inputMode}">`;
		f.addEventListener('load', () => {
			const inner = f.contentDocument.querySelector('input');
			inner.value = input.value;
			inner.addEventListener('input', () => set(input, inner.value));
		});
		hide(input, 'frame', f);
	}

	// A notice that loads late and pushes the page down, once per page.
	let bannerFor = '';
	function banner() {
		if (bannerFor === location.pathname + location.search) return;
		bannerFor = location.pathname + location.search;
		document.querySelector('.eb-banner')?.remove();
		// For tests: the shift still to come.
		document.documentElement.dataset.ebBanner = 'pending';
		setTimeout(() => {
			document.documentElement.dataset.ebBanner = 'shown';
			const main = document.querySelector('main') ?? document.body.firstElementChild;
			if (!main || document.querySelector('.eb-banner')) return;
			const b = el('div', { class: 'eb-banner', role: 'region', 'aria-label': 'Notice' });
			const close = el('button', { type: 'button', class: 'btn-quiet' }, 'Dismiss');
			close.onclick = () => b.remove();
			b.append(el('span', {}, 'Prices and availability change often during busy times. Book early to get the best options.'), close);
			main.before(b);
		}, 900);
	}

	function enhance() {
		// Widgets whose control a re-render removed go too; the rest show the control's current value.
		for (let i = widgets.length - 1; i >= 0; i--) {
			const [c, w, place] = widgets[i];
			if (!c.isConnected) w.remove(), widgets.splice(i, 1);
			else if (!w.isConnected) place();
			else w.sync?.();
		}
		const fresh = (sel) => [...document.querySelectorAll(sel)].filter((c) => !c.dataset.eb && !c.closest('[data-eb-widget]'));
		if (has('select')) fresh('select:not([multiple])').forEach(selectBox);
		if (has('date')) fresh('input[type=date]').forEach(datePicker), fresh('input[type=time]').forEach(timeBox);
		if (has('number')) fresh('input[type=number]').forEach(numberControl);
		if (has('iframe')) fresh('input[autocomplete=cc-number],input[autocomplete=cc-exp],input[autocomplete=cc-csc]').forEach(framed);
		if (has('slide')) [...document.querySelectorAll('form button:not([data-eb-guard])')].filter(guarded).forEach(slideGuard);
		if (has('icons')) fresh('button').forEach(iconify);
		if (has('shift')) banner();
	}
	// After the app has hydrated (a page it renders itself mustn't find strange nodes), then whenever the page changes.
	let queued = false;
	const later = () => queued || ((queued = true), requestAnimationFrame(() => ((queued = false), enhance())));
	addEventListener('load', () =>
		setTimeout(() => {
			enhance();
			new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
			// For tests: the page's controls are in place.
			document.documentElement.dataset.ebReady = '1';
		}, 50)
	);
	setInterval(enhance, 1000);
})();
