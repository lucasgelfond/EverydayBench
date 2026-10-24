<script lang="ts">
	let { data } = $props();
</script>

<h1 class="mb-3 text-xl font-bold">Contacts</h1>
<form class="mb-3"><input class="field mt-0" type="search" name="q" aria-label="Search contacts" placeholder="Search contacts" defaultValue={data.q} /></form>
<ul class="divide-y divide-current/10 rounded-site bg-surface ring-1 ring-current/10" aria-label="Contacts">
	{#each data.contacts as c (c.id)}
		<li class="flex items-center gap-4 px-4 py-3">
			<div class="min-w-0 flex-1">
				<p class="font-semibold">{c.name}</p>
				<p class="text-sm text-muted">{c.email}{c.note ? ` · ${c.note}` : ''}</p>
			</div>
			<a class="btn-quiet text-sm" href="/compose?to={encodeURIComponent(c.email)}" aria-label="Email {c.name}">Email</a>
		</li>
	{:else}
		<li class="px-4 py-6 text-muted">No contacts match.</li>
	{/each}
</ul>
