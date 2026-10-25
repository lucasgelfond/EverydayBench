<script lang="ts">
	import { CHAT_TOPICS, WIFI_PROBLEMS } from '#lib/airline.ts';
	let { data, form } = $props();
</script>

<section class="card mx-auto max-w-xl space-y-4">
	<h1 class="text-xl font-bold">Help</h1>
	<ol aria-label="Chat" class="space-y-2 text-sm">
		{#each data.lines as l, i (i)}
			<li class="rounded px-3 py-2 {l.who === 'bot' ? 'bg-black/5' : 'ml-10 bg-brand text-brand-ink'}">
				<span class="sr-only">{l.who === 'bot' ? 'Assistant:' : 'You:'}</span>
				{l.text}
			</li>
		{/each}
		{#if form?.error}<li class="rounded bg-black/5 px-3 py-2" role="alert"><span class="sr-only">Assistant:</span> {form.error}</li>{/if}
	</ol>
	{#if data.ask === 'topic' || data.ask === 'problem'}
		{@const options = data.ask === 'topic' ? CHAT_TOPICS : WIFI_PROBLEMS}
		<form method="POST" action="?/say" class="flex flex-wrap gap-2">
			{#each Object.entries(options) as [id, label] (id)}
				<button class="btn-quiet" name={data.ask} value={id}>{label}</button>
			{/each}
		</form>
	{:else if data.ask === 'trip'}
		<form method="POST" action="?/say" class="flex flex-wrap items-end gap-2">
			<label class="label">Confirmation code <input class="field font-mono uppercase" name="code" autocomplete="off" required /></label>
			<label class="label">Last name <input class="field" name="last" autocomplete="family-name" required /></label>
			<button class="btn">Send</button>
		</form>
	{:else if data.ask === 'phone'}
		<form method="POST" action="?/say" class="flex flex-wrap items-end gap-2">
			<label class="label">Phone number <input class="field" name="phone" type="tel" autocomplete="tel" required /></label>
			<button class="btn">Send</button>
		</form>
	{/if}
	<form method="POST" action="?/restart"><button class="text-sm underline">Start over</button></form>
</section>
