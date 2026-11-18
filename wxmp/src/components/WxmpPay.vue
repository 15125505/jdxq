<template>
    <div class="all">
        <br>
        <Collapse value="0">
            <Panel>
                <span class="buy-title">江东小乔的云功能</span>
                <div slot="content">
                    作者寄语：您选择使用江东小乔是我的荣幸，非常高兴江东小乔能帮助到您。在购买前，下面这些内容非常希望您能阅读一遍。
                    <Collapse accordion simple>
                        <Panel>
                            开发云功能的初衷
                            <pre slot="content">    作为一个业余的软件作品，江东小乔问世之后，有很多朋友对这个软件表示喜欢和认可。对于任何软件开发者而言，这是比什么都更值得让人开心的事情。
        随着软件的用户越来越多，我却愈加惶恐和忧虑，总有一种如履薄冰的感觉，我不知道这个软件还能正常工作多长时间。不是因为我主观上不愿意维护，也不是因为我承担不了维护成本。只是因为不可抗力太多，谁也不知道以后会发生什么事情。
        由于江东小乔目前是一个工作在Windows上的软件，很多用户没有电脑或者不想长时间开着电脑。然后我见识了很多用户各种神奇的操作，挂机宝、云主机、远程桌面、向日葵、VNC都开始大显神通，甚至还有不少用户来向我和我的小伙伴们咨询这些方面的问题。无奈之下，云功能的开发不得不提上日程。
        对于云功能，我也有一些隐忧，不知道这个功能是否会招致不可抗力的更早到来。虽然很多朋友告诉我 “没有江东小乔他们早就退游了”，我也坚定地认为江东小乔留住了不少玩家朋友，但并不是所有人都这么想。最终考虑再三、心怀忐忑，我还是把这个功能给做了。
        江东小乔的云功能因此诞生，它不是一个单独的功能而是一整套的系统，包含了很多子系统。嗯，工作量挺大的，这也算是为自己开发了这么长时间找个借口吧。</pre>
                        </Panel>
                        <Panel>
                            目前依旧存在的不足
                            <pre slot="content">    云功能目前最大的不足是：依旧不能完全脱离电脑存在。游戏账号的侦测过程，依旧需要在电脑上进行。完全脱离于电脑存在的江东小乔，必须等以后我有时间开发了对应的手机版才行。
        经过我的技术调研，手机版理论上没啥问题。不过需要一点时间，很多年没做手机端开发了，需要抽时间重新学习一下。</pre>
                        </Panel>
                    </Collapse>
                </div>
            </Panel>
        </Collapse>

        <br>
        <Card>
            <div slot="title">购买注册码</div>
            <p>注意：0.66元每天有50个购买额度，凌晨0点重置，同一个微信号，每10天只能购买一次。</p>
            <div v-for="v in prices" :key="v.ProductId">
                <div class="item">
                    <div class="item-name">{{v.ProductInfo}}</div>
                    <div>剩余{{v.Count}}个</div>
                    <div class="item-price">￥{{v.Money/100}}</div>
                    <Button type="primary" @click="onBuy(v.ProductId)">购买</Button>
                </div>
            </div>
        </Card>
    </div>
</template>

<script>
    export default {
        name: "WxmpPay",

        data() {
            return {}
        },

        methods: {
            onBuy(productId) {
                this.$emit('buy-product', productId);
            }
        },

        created() {
        },

        props: ["prices"]
    }

</script>

<style scoped>

    .all {
        display: flex;
        flex-direction: column;
        padding: 10px;
        text-align: left;
    }

    .item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        border-bottom: 1px solid #ccc;
        padding: 5px;
        margin: 5px;
    }

    .item-name {
        min-width: 100px;
    }

    .buy-title {
        color: #2b85e4;
    }

    pre {
        white-space: pre-wrap;
    }

</style>

