<script lang="ts">
	let { data, form } = $props();
</script>

<a href="/" class="text-sm text-muted hover:underline">← Servers</a>
<h1 class="mt-2 mb-4 text-2xl font-bold">{data.server.name}</h1>
<dl class="card mb-6 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
	<dt class="text-muted">Status</dt><dd>Running</dd>
	<dt class="text-muted">Region</dt><dd>{data.server.region}</dd>
	<dt class="text-muted">Size</dt><dd>{data.server.size}</dd>
	<dt class="text-muted">IP address</dt><dd class="font-mono">{data.server.ip}</dd>
	<dt class="text-muted">ID</dt><dd class="font-mono">{data.server.id}</dd>
</dl>
<section class="card ring-red-600/40">
	<h2 class="mb-1 font-semibold text-red-700">Delete server</h2>
	<p class="mb-3 text-sm">This destroys the server and its disk. It can’t be undone.</p>
	<form method="POST" action="?/delete" class="space-y-3">
		<label class="label">Type <strong>{data.server.name}</strong> to confirm <input class="field" name="confirm" autocomplete="off" /></label>
		{#if form?.error}<p class="text-sm font-semibold text-red-600" role="alert">{form.error}</p>{/if}
		<button class="btn bg-red-700">Delete {data.server.name}</button>
	</form>
</section>
