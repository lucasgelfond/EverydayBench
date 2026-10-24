<script lang="ts">
	import { longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
	const stars = (x100: number) => (x100 / 100).toFixed(2);
	// Links to a home carry the search's dates and guests.
	const homeLink = (id: string) => {
		const p = new URLSearchParams();
		for (const k of ['checkIn', 'checkOut', 'guests'] as const) if (data.q[k]) p.set(k, String(data.q[k]));
		return `/homes/${id}${p.size ? `?${p}` : ''}`;
	};
</script>

<form class="card mb-6 grid gap-4 md:grid-cols-4" aria-label="Search homes">
	<label class="label md:col-span-2">Where
		<input class="field" name="city" list="cities" placeholder="Search destinations" defaultValue={data.q.city ?? ''} />
		<datalist id="cities">{#each data.cities as c (c)}<option value={c}></option>{/each}</datalist>
	</label>
	<label class="label">Check in <input class="field" type="date" name="checkIn" defaultValue={data.q.checkIn ?? ''} /></label>
	<label class="label">Check out <input class="field" type="date" name="checkOut" defaultValue={data.q.checkOut ?? ''} /></label>
	<label class="label">Guests <input class="field" type="number" min="1" max="16" name="guests" defaultValue={data.q.guests ?? ''} /></label>
	<label class="label">Bedrooms (at least)
		<select class="field" name="bedrooms">
			<option value="">Any</option>
			{#each [1, 2, 3, 4] as n (n)}<option value={n} selected={data.q.bedrooms === n}>{n}+</option>{/each}
		</select>
	</label>
	<label class="label">Beds (at least)
		<select class="field" name="beds">
			<option value="">Any</option>
			{#each [1, 2, 3, 4, 5] as n (n)}<option value={n} selected={data.q.beds === n}>{n}+</option>{/each}
		</select>
	</label>
	<label class="label">Max price per night ($) <input class="field" type="number" min="1" name="maxPrice" defaultValue={data.q.maxNightlyCents ? data.q.maxNightlyCents / 100 : ''} /></label>
	<fieldset class="md:col-span-3">
		<legend class="label mb-1">Amenities</legend>
		<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
			{#each data.amenityNames as a (a)}
				<label class="flex items-center gap-1.5 capitalize"><input type="checkbox" name="amenity" value={a} defaultChecked={data.q.amenities?.includes(a)} /> {a}</label>
			{/each}
		</div>
	</fieldset>
	<label class="label">Sort by
		<select class="field" name="sort">
			<option value="rating" selected={data.sort === 'rating'}>Top rated</option>
			<option value="price" selected={data.sort === 'price'}>Price: low to high</option>
		</select>
	</label>
	<button class="btn md:col-span-4">Search</button>
</form>

{#if form?.error}<p role="alert" class="mb-3 font-semibold text-red-600">{form.error}</p>{/if}

{#if !data.q.city}
	<h2 class="mb-2 text-lg font-semibold">Popular destinations</h2>
	<ul class="flex gap-3">{#each data.cities as c (c)}<li><a class="btn-quiet" href="/?city={encodeURIComponent(c)}">{c}</a></li>{/each}</ul>
{:else}
	<h1 class="mb-1 text-xl font-bold">{data.results.length} {data.results.length === 1 ? 'home' : 'homes'} in {data.q.city}</h1>
	{#if data.nights}<p class="mb-4 text-sm text-muted">{longDate(data.q.checkIn!)} – {longDate(data.q.checkOut!)} · {data.nights} nights · available homes only</p>{/if}
	<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Results">
		{#each data.results as h (h.id)}
			{@const isSaved = data.saved.includes(h.id)}
			<li class="card relative space-y-1">
				<form method="POST" action={isSaved ? '?/unsave' : '?/save'} class="absolute top-3 right-3">
					<input type="hidden" name="home" value={h.id} /><input type="hidden" name="back" value={data.back} />
					<button class="btn-quiet text-sm" aria-label={isSaved ? `Remove ${h.title} from wishlist` : `Save ${h.title} to wishlist`}>{isSaved ? '♥ Saved' : '♡ Save'}</button>
				</form>
				<a class="block pr-20 font-semibold hover:underline" href={homeLink(h.id)}>{h.title}</a>
				<p class="text-sm text-muted">{h.kind} in {h.area}</p>
				<p class="text-sm">{h.guests} guests · {h.bedrooms} {h.bedrooms === 1 ? 'bedroom' : 'bedrooms'} · {h.beds} {h.beds === 1 ? 'bed' : 'beds'}</p>
				<p class="text-sm">★ {stars(h.rating)} ({h.reviews})</p>
				<p><strong>{money(h.nightlyCents)}</strong> night{#if h.total}<span class="text-sm text-muted"> · {money(h.total)} total</span>{/if}</p>
			</li>
		{:else}
			<li class="text-muted">No homes match. Try fewer filters or other dates.</li>
		{/each}
	</ul>
{/if}
