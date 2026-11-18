import './style.css';
import {Log} from "./log";
import {decodeString, initPack} from "./pack";

initPack();

Log.log('【江东小乔的解码工具】（在内容框单击可以直接复制）');

let item = document.getElementById('src-string');

window.onDecode =  () => {
    decodeString(item.value);
};
