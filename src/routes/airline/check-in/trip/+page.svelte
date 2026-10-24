<script lang="ts">
	import AirSeatMap from '#lib/ui/AirSeatMap.svelte';
	import { airport, checkinSeatFee, seatKind } from '#lib/airline.ts';
	import { clock, longDate, money } from '#lib/time.ts';
	let { data, form } = $props();
	const pickHref = (seat: string | null) => {
		const q = new URLSearchParams({ code: data.code, last: data.last });
		if (seat) q.set('seat', seat);
		return `?${q}`;
	};
</script>

{#if data.missing}
	<form method="GET" class="card mx-auto max-w-sm space-y-4">
		<h1 class="text-xl font-bold">Check in</h1>
		<p class="text-sm font-semibold text-red-600" role="alert">We couldn’t find a trip with that confirmation code and last name.</p>
		<label class="label">Confirmation code <input class="field font-mono uppercase" name="code" required defaultValue={data.code} /></label>
		<label class="label">Last name <input class="field" name="last" required defaultValue={data.last} /></label>
		<button class="btn w-full">Find my trip</button>
	</form>
{:else}
	<h1 class="text-2xl font-bold">Check in: {data.first} {data.last}</h1>
	<p class="mb-5 text-muted">Confirmation code <span class="font-mono">{data.code}</span></p>
	{#if form?.error}<p class="card mb-4 font-semibold text-red-600" role="alert">{form.error}</p>{/if}
	{#each data.legs as l (l.flight.id)}
		<section class="card mb-4" aria-label="{l.flight.number} to {airport(l.flight.destination)}">
			<h2 class="font-semibold">{l.flight.number}: {airport(l.flight.origin)} → {airport(l.flight.destination)}</h2>
			<p class="mb-3 text-sm text-muted">{longDate(l.flight.departsAt.slice(0, 10))}, departs {clock(l.flight.departsAt)}</p>
			{#if l.state === 'done' && l.checkin}
				<p role="status"><strong>You’re checked in.</strong> Seat {l.checkin.seat}.</p>
				<p class="mt-3 flex flex-wrap gap-3">
					<a class="btn" href="/boarding-pass/{l.checkin.pass}">Boarding pass</a>
					<a class="btn-quiet" href="/boarding-pass/{l.checkin.pass}.pkpass">Add to Apple Wallet</a>
				</p>
				<p class="mt-2 text-sm text-muted">We’ve also emailed your boarding pass.</p>
			{:else if l.state === 'early'}
				<p role="status">Check-in for this flight opens {longDate(l.opens.slice(0, 10))} at {clock(l.opens)}, 24 hours before departure.</p>
			{:else if l.state === 'closed'}
				<p role="status">Online check-in for this flight has closed. See an agent at the airport.</p>
			{:else if l.seat}
				<form method="POST">
					<p class="mb-3">Seat {l.seat}.</p>
					<input type="hidden" name="flight" value={l.flight.id} />
					<button class="btn">Check in</button>
				</form>
			{:else}
				<p class="mb-3">You don’t have a seat yet. Middle seats are free; other seats are {money(checkinSeatFee('1A'))}, charged to the card on this trip.</p>
				<AirSeatMap cabin={l.cabin} taken={l.taken} selected={l.pick} fee={checkinSeatFee} href={pickHref} />
				<form method="POST" class="mt-4 flex flex-wrap items-center gap-3" aria-live="polite">
					<input type="hidden" name="flight" value={l.flight.id} />
					<input type="hidden" name="seat" value={l.pick ?? ''} />
					{#if l.pick}
						<p>Seat <strong>{l.pick}</strong> ({seatKind(l.pick)}){checkinSeatFee(l.pick) ? `: ${money(checkinSeatFee(l.pick))}` : ', free'}.</p>
						<button class="btn">{checkinSeatFee(l.pick) ? `Pay ${money(checkinSeatFee(l.pick))} and check in` : 'Check in'}</button>
					{:else}
						<p>Choose a seat to check in.</p>
						<button class="btn" disabled>Check in</button>
					{/if}
				</form>
			{/if}
		</section>
	{/each}
{/if}
