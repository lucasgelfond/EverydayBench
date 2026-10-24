<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head><title>Sweatlantis</title></svelte:head>
<header class="bg-brand text-brand-ink">
	<div class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
		<a href="/" class="text-xl font-black tracking-tight">SWEATLANTIS</a>
		<nav aria-label="Main" class="flex flex-1 items-center gap-5 text-sm">
			<a href="/schedule">Class schedule</a>
			<span class="flex-1"></span>
			{#if data.member}<a href="/account">My classes · {data.member.split(' ')[0]}</a>{:else}<a href="/account/sign-in">Member sign in</a>{/if}
		</nav>
	</div>
</header>
<main class="mx-auto max-w-5xl px-4 py-6">{@render children()}</main>
<footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-muted">Sweatlantis · Dive in. Sweat out.</footer>
