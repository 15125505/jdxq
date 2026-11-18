<template>
    <div>
        <Collapse>
            <Panel>
                本月信息
                <MonthSale slot="content" :info="info.ThisMonth" v-if="info.ThisMonth"/>
            </Panel>
            <Panel>
                上月信息
                <MonthSale slot="content" :info="info.LastMonth" v-if="info.LastMonth"/>
            </Panel>
        </Collapse>
    </div>
</template>

<script>
    import MonthSale from "./MonthSale";
    export default {
        name: "ChannelInfo",
        components: {MonthSale},
        props: ["info"]
    }
</script>


<style scoped>

</style>
