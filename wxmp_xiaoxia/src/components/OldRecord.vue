<template>
  <div>
    <Alert style="padding: 10px;margin: 0 10px">
      本页面用于查询之前“江东小乔”或“云上江东”公众号上购买的注册码。为了保证您的利益，保证您之前的购买记录只能被您自己查询到，下面需要您提供当时的<b>微信交易单号</b>作为查询凭证。<br><br>
      <b>交易单号</b>获取方法：在<b>微信钱包的账单</b>里面，找到之前的购买记录，<b>点击查看记录详情</b>。可以看到<b>交易单号</b>，将那串<b>长数字</b>长按复制即可。<br><br>
      注意：如果您输入的交易单号是在“江东小乔”公众号发生的，那么查询的记录也是该公众号上的。“云上江东”同理。
    </Alert>
    <div style="background:#eee;padding: 10px">
      <Input search enter-button="查询" v-model="tId"
             placeholder="请输入旧公众号发生的交易单号..." @on-search="search()"/>
    </div>
    <div style="background:#eee;padding: 10px" v-for="(item, index) in records" :key="index">
      <Card>
        <div slot="title">
          <div class="title">
            <div>{{ item.Sn }}</div>
            <Button @click="copy(item.Sn)" size="small" type="success" :disabled="!!item.UseTime">
              {{ !item.UseTime ? '复制' : '已使用' }}
            </Button>
          </div>
        </div>
        <div class="row">
          <div>创建时间</div>
          <div>{{ item.CreateTime }}</div>
        </div>
        <div class="row">
          <div>使用时间</div>
          <div v-bind:class="{'item-no-use' : !item.UseTime}">{{ item.UseTime ? item.UseTime : '尚未被使用' }}</div>
        </div>
        <div class="row">
          <div>使用者角色ID</div>
          <div v-bind:class="{'item-no-use' : !item.UseTime}">{{ item.UseRoleId ? item.UseRoleId : '尚未被使用' }}
          </div>
        </div>
        <div class="row">
          <div>包含时间</div>
          <div>{{ item.TotalTime }} 天</div>
        </div>
        <div class="row">
          <div>微信交易单号</div>
          <div>{{ item.TransactionId }}</div>
        </div>
        <div class="row">
          <div>费用</div>
          <div>{{ item.Money / 100 }} 元</div>
        </div>
      </Card>
    </div>
    <div class="tip" v-if="!records.length">
      {{ tipInfo }}
    </div>
  </div>
</template>

<script>

import {copyText} from '../utils/utils';
import {oldRecords} from "@/utils/common";

export default {
  name: "OldRecord",
  methods: {
    copy(text) {
      copyText(text);
    },
    search() {
      oldRecords(this.tId, records => {
        this.records = records;
        this.tipInfo = '没有搜索到任何记录！';
        }, err => {
        this.records = [];
        this.tipInfo = `查询出错：${err}`;
      });
    }
  },
  data() {
    return {
      tId: '',
      records: [],
      tipInfo: '请输入旧交易单号进行搜索……'
    };
  },
  props: []
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

b {
  color: blue;
}

</style>
