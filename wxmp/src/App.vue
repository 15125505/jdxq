<template>
    <div id="app">
        <Tabs type="card" class="tab" v-on:on-click="onTabChange" v-model="curTab">
            <TabPane label="获取注册码">
                <WxmpPay class="sub-card" :prices="prices" @buy-product="onBuy"/>
            </TabPane>
            <TabPane label="注册码记录" name="record">
                <Record class="sub-card" :records="records" ref="record"/>
            </TabPane>
            <TabPane label="销售记录" name="channel" v-if="userType === 1">
                <ChannelInfo class="sub-card" :info="payRecord" ref="channel"/>
            </TabPane>
            <TabPane label="渠道信息" name="admin" v-if="userType === 2">
                <AdminInfo class="sub-card" :info="payRecord" ref="admin"/>
            </TabPane>
        </Tabs>
    </div>
</template>

<script>
    import WxmpPay from "./components/WxmpPay";
    import Record from "./components/Record";
    import ChannelInfo from "./components/ChannelInfo";
    import AdminInfo from "./components/AdminInfo";
    import {gData} from "./utils/gData";
    import {GetQueryString, zReq} from "./utils/utils";
    import {payRecords, isTestMode, login, records, wxPrePay} from "./utils/common";

    const AppId = 'CHANGEME';

    export default {
        name: 'app',
        components: {
            Record,
            WxmpPay,
            ChannelInfo,
            AdminInfo,
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
            onTabChange(name) {
                switch (name) {
                    case 'record':
                        this.updateRecords();
                        break;
                    case 'channel':
                    case 'admin':
                        this.updatePayRecord(name);
                        break;
                }
            },

            /**
             * 用户点击购买
             */
            onBuy(productId) {

                // 获取预支付的参数
                this.$Spin.show();
                wxPrePay(gData.token, productId, data => {
                    this.$Spin.hide();
                    window.WeixinJSBridge && window.WeixinJSBridge.invoke(
                        'getBrandWCPayRequest',
                        data,
                        res => {
                            if (res.err_msg === "get_brand_wcpay_request:ok") {
                                this.updateRecords();
                            } else if (res.err_msg === 'system:function_not_implement') {
                                this.$Modal.error({
                                    title: '发起支付失败',
                                    content: `请在手机上进行购买。`,
                                    onOk() {
                                    }
                                });

                            }
                        }
                    );
                }, err => {
                    this.showErr(`发起支付失败：${err}`);
                });
            },

            /**
             * 初始化函数
             */
            init() {

                // 如果当前token有效，那么直接进行价格获取
                if (localStorage.token) {
                    gData.token = localStorage.token;
                    zReq("wxmpProducts", {token: gData.token}, (ret) => {
                        this.prices = ret.Products;
                        this.userType = ret.UserType;
                    }, err => {
                        console.log('获取价格列表失败：', err);
                        delete localStorage.token;
                        this.goHome();
                    });
                    return;
                }


                // 获取渠道信息
                this.channel = GetQueryString("state");

                // 如果code无效，那么直接页面跳转获取code
                let code = GetQueryString("code");
                if (!code) {
                    let url = window.location.href.split('?')[0];
                    if (isTestMode) {
                        window.location.href = `${url}?code=abc&state=${this.channel}`;
                    } else {
                        window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${AppId}&redirect_uri=${encodeURIComponent(url)}&response_type=code&scope=snsapi_userinfo&state=${this.channel}#wechat_redirect`;
                    }
                    return;
                }

                // 如果code有效，那么执行登录
                this.$Spin.show();
                login(code, (data) => {
                    this.$Spin.hide();
                    gData.token = data.token;
                    localStorage.token = data.token;
                    this.prices = data.prices;
                    this.userType = data.userType;
                }, err => {
                    this.showErr(`登录失败：${err}`);
                });
            },

            /**
             * 更新购买历史记录
             */
            updateRecords() {

                // 切换到的历史记录页面
                this.curTab = 'record';

                // 获取购买记录
                this.$Spin.show();
                records(gData.token, (data) => {
                    this.$Spin.hide();
                    this.records = data;
                }, err => {
                    console.log("....", this, this.showErr, this.updateRecords);
                    this.showErr(`获取记录出错：${err}`);
                });
            },

            /**
             * 更新销售记录
             */
            updatePayRecord(tabName) {

                // 切换到的历史记录页面
                this.curTab = tabName;

                // 获取购买记录
                this.$Spin.show();
                payRecords(gData.token, (data) => {
                    this.$Spin.hide();
                    this.payRecord = data;
                }, err => {
                    this.showErr(`获取记录出错：${err}`);
                });
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
