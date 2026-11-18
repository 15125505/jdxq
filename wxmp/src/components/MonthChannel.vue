<template>
    <div>
        <div class="row">
            <div>总销量</div>
            <div>{{totalCount}} 个</div>
        </div>
        <div class="row">
            <div>总金额</div>
            <div>{{totalMoney / 100}} 元</div>
        </div>
        <Collapse simple>
            <Panel v-for="(item, index) in info" :key="index">
                <span class="title">{{item.ChannelName}} <span>{{item.Money/100}}元</span></span>
                <div slot="content">
                    <div class="row">
                        <div>联系人</div>
                        <div><img :src="item.Avatar" alt="头像"/>{{item.Nick}}
                        </div>
                    </div>
                    <div class="row">
                        <div>销量</div>
                        <div>{{item.Count}} 个</div>
                    </div>
                    <div class="row">
                        <div>金额</div>
                        <div>{{item.Money/100}} 元</div>
                    </div>
                </div>
            </Panel>
        </Collapse>
    </div>
</template>

<script>
    export default {
        name: "MonthChannel",
        props: ["info"],
        computed: {
            totalCount() {
                let count = 0;
                this.info.forEach(v=> count += v.Count);
                return count;
            },
            totalMoney() {
                let money = 0;
                this.info.forEach(v => money += v.Money);
                return money;
            }
        }
    }
</script>

<style scoped>
    .title {
        color: rgba(0, 0, 0, 0.5);
    }

    .title span {
        font-weight: bold;
        color: rgba(0, 0, 255, 0.8);
    }

    .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .row div {
        display: flex;
        align-items: center;
    }

    .row img {
        margin: 0 5px;
        width: 25px;
        height: 25px;
    }

</style>
