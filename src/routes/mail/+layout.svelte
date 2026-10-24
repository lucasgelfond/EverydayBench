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
	<nav aria-label="Folders" class="w-36 shrink-0 text-sm"><a href="/" class="block rounded-site bg-brand/10 px-3 py-2 font-semibold">Inbox{data.unread ? ` (${data.unread})` : ''}</a></nav>
	<main class="min-w-0 flex-1">{@render children()}</main>
</div>
