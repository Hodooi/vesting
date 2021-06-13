<template>
  <div>
    <section class="section">
      <div class="container">
        <div class="has-text-centered block">
          <img :src="require('@/assets/img/logo-vertical.png')" width="175" class="mb-4">
          <h1 class="site-title is-spaced title">Vesting<span class="has-text-secondary">.</span></h1>
          <h3 class="subtitle">Claim your vested HOD Tokens</h3>
        </div>
      </div>
    </section>
    <div class="container">
      <div class="box is-horizontal-centered has-limited-width has-background-image bg-dark p-6">
        <h2 class="title">Vesting Contract</h2>
        <p>Fill in the contract that holds your vested tokens</p>
        <form @submit.prevent="$router.push(`/address/${address}`)">
          <input v-model="address" type="text" class="input is-medium" required placeholder="Insert BSC address" />
          <button :disabled="!address" class="button is-medium is-secondary is-fullwidth mt-5" type="submit">
            <strong>See Tokens</strong>
          </button>
        </form>
      </div>
    </div>
    <!-- Educational Resources -->
    <div class="has-text-centered my-5">
      <a class="" href="https://hodooi.com" target="_blank">
        <strong>Learn more about HoDooi.com</strong>
      </a>
    </div>
  </div>
</template>

<script>

export default {
  components: {},
  data () {
    return {
      address: null
    }
  },

  methods: {},

  created () {
  },
}
</script>

<style lang="scss" scoped>
.site-title {
  font-size: 75px;
}
.bg-dark {
  background-image: url('~assets/img/bg.jpg');
  color: white;
  .title, .subtitle {
    color: white;
  }
}
</style>
