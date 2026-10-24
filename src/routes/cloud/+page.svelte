<script lang="ts">
	let { data } = $props();
</script>

<h1 class="mb-4 text-2xl font-bold">Servers</h1>
{#if data.deleted}<p role="status" class="card mb-4">Server <strong>{data.deleted}</strong> was deleted.</p>{/if}
<table class="card w-full text-left text-sm">
	<thead class="text-muted"><tr><th class="py-2">Name</th><th>Region</th><th>Size</th><th>IP address</th><th>Status</th></tr></thead>
	<tbody>
		{#each data.servers as s (s.id)}
			<tr class="border-t border-current/10"><td class="py-2"><a class="font-semibold text-brand underline" href="/servers/{s.id}">{s.name}</a></td><td>{s.region}</td><td>{s.size}</td><td class="font-mono">{s.ip}</td><td>Running</td></tr>
		{:else}<tr><td class="py-2 text-muted" colspan="5">No servers.</td></tr>{/each}
	</tbody>
</table>
