<script lang="ts">
	import Reset from '#lib/ui/account/Reset.svelte';
	let { data, form } = $props();
</script>

<Reset token={data.token} {form} />
