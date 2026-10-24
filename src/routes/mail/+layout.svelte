<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
</script>

<svelte:head><title>Mailmoss — {data.owner.email}</title></svelte:head>
<header class="border-b border-current/10 bg-surface">
	<div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
		<a href="/" class="text-lg font-bold text-brand">Mailmoss</a>
		<form action="/" class="flex-1"><input class="field mt-0" type="search" name="q" placeholder="Search mail" aria-label="Search mail" defaultValue={page.url.searchParams.get('q') ?? ''} /></form>
		<span class="text-sm text-muted">{data.owner.email}</span>
	</div>
</header>
<div class="mx-auto flex max-w-5xl gap-6 px-4 py-4">
	<nav aria-label="Folders" class="w-36 shrink-0 space-y-1 text-sm">
		<a href="/compose" class="btn mb-3 w-full">Compose</a>
		{#each [['/', `Inbox${data.unread ? ` (${data.unread})` : ''}`], ['/sent', 'Sent'], ['/contacts', 'Contacts']] as [href, label] (href)}
			<a {href} class="block rounded-site px-3 py-2 {page.url.pathname === href ? 'bg-brand/10 font-semibold' : 'hover:bg-current/5'}" aria-current={page.url.pathname === href ? 'page' : undefined}>{label}</a>
		{/each}
	</nav>
	<main class="min-w-0 flex-1">{@render children()}</main>
</div>
