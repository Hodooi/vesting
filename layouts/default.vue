<template>
  <div id="app">
    <bsc-wallet />
    <Nuxt />
  </div>
</template>

<script>
import BscWallet from '@/components/BscWallet';

export default {
  components: {
    BscWallet
  }
}
</script>

<style lang="scss">
html {
  min-height: 100vh;
  // background: url('~assets/img/bg.jpg');
  background-size: cover;
  background-position: center;
}
</style>
