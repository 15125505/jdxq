<template>
    <div>
        <Collapse>
            <Panel>
                本月信息
                <MonthChannel slot="content" :info="info.ThisMonth" v-if="info.ThisMonth"/>
            </Panel>
            <Panel>
                上月信息
                <MonthChannel slot="content" :info="info.LastMonth" v-if="info.LastMonth"/>
            </Panel>
        </Collapse>
    </div>
</template>

<script>
    import MonthChannel from "./MonthChannel";
    export default {
        name: "AdminInfo",
        components: {MonthChannel},
        props: ["info"]
    }
</script>

<style scoped>

</style>
