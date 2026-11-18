<template>
    <div>
        <Alert style="padding: 10px;margin: 0 10px">微信支付有时候到账可能会有延迟，如付款后没收到注册码，请过一会儿之后重新进入本页面。</Alert>
        <div style="background:#eee;padding: 10px" v-for="(item, index) in records" :key="index">
            <Card>
                <div slot="title">
                    <div class="title">
                        <div>{{item.Sn}}</div>
                        <Button @click="copy(item.Sn)" size="small" type="success" :disabled="!!item.UseTime">{{!item.UseTime ? '复制' : '已使用'}}</Button>
                    </div>
                </div>
                <div class="row">
                    <div>创建时间</div>
                    <div>{{item.CreateTime}}</div>
                </div>
                <div class="row">
                    <div>使用时间</div>
                    <div v-bind:class="{'item-no-use' : !item.UseTime}">{{item.UseTime ? item.UseTime : '尚未被使用'}}</div>
                </div>
                <div class="row">
                    <div>使用者角色ID</div>
                    <div v-bind:class="{'item-no-use' : !item.UseTime}">{{item.UseRoleId ? item.UseRoleId: '尚未被使用'}}
                    </div>
                </div>
                <div class="row">
                    <div>包含时间</div>
                    <div>{{item.TotalTime}} 天</div>
                </div>
                <div class="row">
                    <div>微信交易单号</div>
                    <div>{{item.TransactionId}}</div>
                </div>
                <div class="row">
                    <div>费用</div>
                    <div>{{item.Money / 100}} 元</div>
                </div>
            </Card>
        </div>
        <div class="tip" v-if="!records.length">
            您没有任何购买记录~~~
        </div>
    </div>
</template>

<script>

    import {copyText} from '../utils/utils';

    export default {
        name: "Record",
        methods: {
            copy(text) {
                copyText(text);
            }
        },
        data() {
            return {};
        },
        props: ["records"]
    }
</script>

<style scoped>

    .title {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .row {
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        margin-bottom: 2px;
    }

    .item-no-use {
        color: rgba(0, 0, 255, 0.8);
        font-weight: bold;
    }

    .item-use {
        color: rgba(255, 0, 0, 0.8);
        font-weight: bold;
    }

    .vip {
        color: rgba(0, 150, 0, 0.8);
        font-weight: bold;
    }

    .tip {
        padding-top: 50px;
        color: rgba(0, 0, 0, 0.7);
        text-align: center;
    }

</style>
