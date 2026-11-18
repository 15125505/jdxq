<template>
    <div id="app">
        <Tabs type="card" class="tab" v-on:on-click="onTabChange" v-model="curTab">
            <TabPane label="旧注册码记录" name="oldRecord">
                <OldRecord class="sub-card" ref="oldRecord"/>
            </TabPane>
        </Tabs>
    </div>
</template>

<script>
    import OldRecord from "./components/OldRecord";

    export default {
        name: 'app',
        components: {
            OldRecord,
        },
        data() {
            return {
                prices: [],
                records: [],
                curTab: 0,
                userType: 0,
                payRecord: {},
            }
        },
        methods: {

            /**
             * tab页切换
             */
            onTabChange() {
            },

            /**
             * 初始化函数
             */
            init() {

            },

            /**
             * 显示错误信息并返回
             */
            showErr(errMsg) {
                let that = this;
                this.$Spin.hide();
                this.$Modal.error({
                    title: '错误',
                    content: errMsg,
                    onOk() {
                        that.goHome();
                    }
                });
            },

            /**
             * 返回主页
             */
            goHome() {
                window.location.href = window.location.href.split('?')[0] + `?state=${this.channel}`;
            },

        },

        created() {
            this.init();
        },

    }
</script>

<style>

    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        background: #eee;
    }

    .tab {
        padding: 5px;
        overflow-y: auto;
    }

    .sub-card {
        height: calc(100vh - 60px);
        overflow-y: auto;
    }


</style>
