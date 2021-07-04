<template>
	<body>
		<Toast position="top-right" />
		<router-view />
	</body>
</template>

<style lang="scss">
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
}

#nav {
	padding: 30px;

	a {
		font-weight: bold;
		color: #2c3e50;

		&.router-link-exact-active {
			color: #42b983;
		}
	}
}
body {
	margin: 0px;
	background-color: var(--surface-a);
}

// WA to make sure the tabs bar will not appere on the opend menu items
.p-tabview-ink-bar {
	z-index: 0 !important;
}
</style>
