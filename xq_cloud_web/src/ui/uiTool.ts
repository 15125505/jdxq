// 作者： maintainer
// 描述: uiTool.ts
// 日期: 2024-01-31

import Swal from "sweetalert2";
import './myForm.css'


class UiTool {

    /**
     * 显示toast
     */
    toast(msg: string, color ?: 'toast-primary' | 'toast-success' | 'toast-warning' | 'toast-error') {

        // 获取toastContainer元素
        let toastContainer = document.querySelector('.toastContainer') as HTMLDivElement;
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            document.body.appendChild(toastContainer);
            toastContainer.classList.add('toastContainer');
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '30%';
            toastContainer.style.left = '50%';
            toastContainer.style.transform = 'translateX(-50%)';
            toastContainer.style.zIndex = '500';
        }

        // 创建一个toast元素
        const toast = document.createElement('div');
        toast.classList.add('animate__animated', 'animate__faster', 'animate__fadeInLeft', 'toast');
        toast.style.marginTop = '10px';
        if (color) {
            toast.classList.add(color);
        }
        toast.innerText = msg;

        // 将toast元素添加到toastContainer中
        toastContainer.appendChild(toast);

        // 3秒后toast渐隐消失
        setTimeout(() => {
            toast.classList.add('animate__fadeOutRight');
            setTimeout(() => {
                toast.remove();

                // 如果toastContainer中没有元素了，就把toastContainer也删除掉
                if (toastContainer.childNodes.length == 0) {
                    toastContainer.remove();
                }
            }, 500);
        }, 2000);
    }

    /**
     * 显示一个模态框
     * 用户点击确定，返回true，否则返回false
     */
    async modal(options: ui.ModalOption): Promise<boolean> {

        // 创建一个根元素
        const root = document.createElement('div');
        document.body.appendChild(root);

        // 确定和取消按钮消息响应
        let onOK: () => void = null;
        let onCancel: () => void = null;

        // 创建一个div
        const div = document.createElement('div');
        root.appendChild(div);
        div.classList.add('modal', 'active');     // 这个是为了让它能有pure.css的对话框样式和入场动画

        // 保证点击对话框外面的区域，对话框会消失
        const overlay = document.createElement('div');
        div.appendChild(overlay);
        overlay.classList.add('modal-overlay');
        options.overlayDisable || overlay.addEventListener('click', () => onCancel());

        // 创建内容区域
        const container = document.createElement('div');
        div.appendChild(container);
        container.classList.add('modal-container');

        // 标题栏
        if (options.title) {
            const head = document.createElement('div');
            container.appendChild(head);
            head.classList.add('modal-header');

            // 右上角的关闭按钮
            const closeButton = document.createElement('button');
            head.appendChild(closeButton);
            closeButton.classList.add('btn', 'btn-clear', 'float-right');
            closeButton.addEventListener('click', () => onCancel());

            // 左上角的标题文字
            const titleDiv = document.createElement('div');
            head.appendChild(titleDiv);
            titleDiv.classList.add('modal-title', 'h5');
            titleDiv.innerText = options.title;
        }

        // 主体部分
        const body = document.createElement('div');
        container.appendChild(body);
        body.classList.add('modal-body');
        if (typeof options.content === 'string') {
            body.innerHTML = options.content;
        } else {
            body.appendChild(options.content);
        }

        // 底部按钮部分
        if (options.ok || options.cancel || options.exButton) {
            const footer = document.createElement('div');
            container.appendChild(footer);
            footer.classList.add('modal-footer');
            if (options.exButton) {
                const exButton = document.createElement('button');
                footer.appendChild(exButton);
                exButton.classList.add('btn', 'btn-success', 'tooltip');

                exButton.setAttribute('data-tooltip', options.exButton.desc);
                exButton.innerText = options.exButton.text;
                exButton.addEventListener('click', () => options.exButton.click());
            }
            footer.appendChild(document.createTextNode(' ')); // 这个是为了让两个按钮之间有间隔
            if (options.ok) {
                const okButton = document.createElement('button');
                footer.appendChild(okButton);
                okButton.classList.add('btn', 'btn-primary');
                okButton.innerText = '确定';
                okButton.addEventListener('click', () => onOK());
            }
            footer.appendChild(document.createTextNode(' ')); // 这个是为了让两个按钮之间有间隔
            if (options.cancel) {
                const cancelButton = document.createElement('button');
                footer.appendChild(cancelButton);
                cancelButton.classList.add('btn');
                cancelButton.innerText = '取消';
                cancelButton.addEventListener('click', () => onCancel());
            }
        }

        // 等待用户操作
        return new Promise((resolve) => {

            onOK = () => {
                if (options.dataVerify && !options.dataVerify()) {
                    return;
                }
                overlay.style.opacity = '0';
                div.classList.add('animate__animated', 'animate__faster', 'animate__zoomOut');
                setTimeout(() => {
                    root.remove();
                    resolve(true);
                }, 300);
            }

            onCancel = () => {
                overlay.style.opacity = '0';
                div.classList.add('animate__animated', 'animate__faster', 'animate__zoomOut');
                setTimeout(() => {
                    root.remove();
                    resolve(false);
                }, 300);
            }
        });
    }

    /**
     * 根据配置项获取用户输入
     */
    async getUserParam(param: ui.UserParam, isSwl = false): Promise<boolean> {

        // 创建对应的表单元素
        const form = document.createElement('form');
        form.classList.add('form-horizontal');
        param.items.forEach(item => {

            // 创建form-group
            const formGroup = document.createElement('div');
            form.appendChild(formGroup);
            formGroup.classList.add('form-group');

            // 创建左侧的label
            const left = document.createElement('div');
            formGroup.appendChild(left);
            left.classList.add('col-3', 'col-sm-12');
            const label = document.createElement('label');
            left.appendChild(label);
            label.classList.add('form-label');
            label.appendChild(document.createTextNode(item.name));

            // 创建右侧的实际内容
            const right = document.createElement('div');
            formGroup.appendChild(right);
            right.classList.add('col-9', 'col-sm-12');
            if (item.type == 'number') {
                const cfg = item as ui.NumberConfigItem;
                const input = document.createElement('input');
                right.appendChild(input);
                input.classList.add('form-input');
                input.setAttribute('type', 'number');
                input.setAttribute('min', cfg.minValue.toString());
                input.setAttribute('max', cfg.maxValue.toString());
                input.setAttribute('value', (cfg.currentValue ?? 0).toString());
                item.domItem = input;
            } else if (item.type == 'switch') {
                const cfg = item as ui.SwitchConfigItem;
                const label = document.createElement('label');
                right.appendChild(label);
                label.classList.add('form-switch');
                const input = document.createElement('input');
                label.appendChild(input);
                input.setAttribute('type', 'checkbox');
                input.checked = cfg.currentValue;
                const i = document.createElement('i');
                label.appendChild(i);
                i.classList.add('form-icon');
                label.appendChild(document.createTextNode(cfg.label || item.name));
                item.domItem = input;
            } else if (item.type == 'radio') {
                const cfg = item as ui.RadioConfigItem;
                item.domItems = [];
                cfg.options.forEach((option) => {
                    const label = document.createElement('label');
                    right.appendChild(label);
                    label.classList.add('form-radio', 'form-inline');
                    const input = document.createElement('input');
                    label.appendChild(input);
                    input.setAttribute('type', 'radio');
                    input.setAttribute('name', item.name);
                    input.setAttribute('value', option.value);
                    input.checked = cfg.currentValue == option.value;
                    const i = document.createElement('i');
                    label.appendChild(i);
                    i.classList.add('form-icon');
                    label.appendChild(document.createTextNode(option.name));
                    item.domItems.push(input);
                });
            } else if (item.type == 'checkbox') {
                const cfg = item as ui.CheckboxConfigItem;
                item.domItems = [];
                if (cfg.hasAll) {
                    const label = document.createElement('label');
                    right.appendChild(label);
                    label.classList.add('form-checkbox');
                    const input = document.createElement('input');
                    label.appendChild(input);
                    input.setAttribute('type', 'checkbox');
                    input.setAttribute('value', '-1');
                    input.checked = cfg.currentValue.length == cfg.options.length;
                    const i = document.createElement('i');
                    label.appendChild(i);
                    i.classList.add('form-icon');
                    label.appendChild(document.createTextNode('全选'));
                    item.domItems.push(input);

                    // 为全选按钮添加事件
                    item.domItems[0].addEventListener('change', (e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        for (let i = 1; i < item.domItems.length; i++) {
                            (item.domItems[i] as HTMLInputElement).checked = checked;
                        }
                    });
                }
                cfg.options.forEach((option) => {
                    const label = document.createElement('label');
                    right.appendChild(label);
                    label.classList.add('form-checkbox', 'form-inline');
                    const input = document.createElement('input');
                    label.appendChild(input);
                    input.setAttribute('type', 'checkbox');
                    input.setAttribute('value', option.value);
                    input.checked = cfg.currentValue.includes(option.value);
                    const i = document.createElement('i');
                    label.appendChild(i);
                    i.classList.add('form-icon');
                    label.appendChild(document.createTextNode(option.name));
                    item.domItems.push(input);
                });
            } else if (item.type == 'checkboxWidthSelect') {
                const cfg = item as ui.CheckWidthSelectConfigItem;
                item.domItems = [];
                cfg.options.forEach((option, index) => {

                    // 创建div, 并设置input-group样式，用于包裹checkbox和select
                    const div = document.createElement('div');
                    right.appendChild(div);
                    div.classList.add('input-group');

                    // 创建checkbox
                    const label = document.createElement('label');
                    div.appendChild(label);
                    label.classList.add('form-checkbox', 'col-4');
                    const input = document.createElement('input');
                    label.appendChild(input);
                    input.setAttribute('type', 'checkbox');
                    input.setAttribute('value', index.toString());
                    input.checked = cfg.currentValue[index]?.isCheck ?? false;
                    const i = document.createElement('i');
                    label.appendChild(i);
                    i.classList.add('form-icon');
                    label.appendChild(document.createTextNode(option.name));
                    item.domItems.push(input);

                    // 创建select
                    const select = document.createElement('select');
                    div.appendChild(select);
                    select.classList.add('form-select', 'select-sm');
                    option.options.forEach((option) => {
                        const optionElement = document.createElement('option');
                        select.appendChild(optionElement);
                        optionElement.setAttribute('value', option.value);
                        optionElement.innerText = option.name;
                        if (cfg.currentValue[index]?.selected == option.value) {
                            optionElement.setAttribute('selected', 'selected');
                        }
                    });
                    item.domItems.push(select);
                });

            } else if (item.type == 'select') {
                const cfg = item as ui.SelectConfigItem;
                const select = document.createElement('select');
                right.appendChild(select);
                select.classList.add('form-select');
                cfg.options.forEach((option) => {
                    const optionElement = document.createElement('option');
                    select.appendChild(optionElement);
                    optionElement.setAttribute('value', option.value);
                    optionElement.innerText = option.name;
                    if (cfg.currentValue == option.value) {
                        optionElement.setAttribute('selected', 'selected');
                    }
                });
                item.domItem = select;
            } else if (item.type == 'string') {
                const cfg = item as ui.StringConfigItem;
                const input = document.createElement('input');
                right.appendChild(input);
                input.classList.add('form-input');
                input.setAttribute('type', 'text');
                input.setAttribute('value', cfg.currentValue);
                item.domItem = input;
            }

            // 创建描述
            if (item.desc) {
                const inputHint = document.createElement('p');
                formGroup.appendChild(inputHint);
                inputHint.classList.add('form-input-hint');
                inputHint.appendChild(document.createTextNode(item.desc));
            }
        });

        // 创建提示信息
        const inputHint = document.createElement('div');
        form.appendChild(inputHint);
        inputHint.classList.add('toast', 'toast-error');
        inputHint.style.display = 'none';

        // 在form中有input时候，隐藏提示信息
        form.addEventListener('input', () => {
            inputHint.style.display = 'none';
        });

        // 用于检查数据是否合法的函数
        const dataVerify = () => {

            // 获取每个配置项的值
            for (const item of param.items) {
                if (item.type == 'number') {
                    const cfg = item as ui.NumberConfigItem;
                    cfg.currentValue = parseInt((cfg.domItem as HTMLInputElement).value);
                    if (cfg.currentValue < cfg.minValue || cfg.currentValue > cfg.maxValue) {
                        inputHint.innerText = `${item.name}的值必须在${cfg.minValue}和${cfg.maxValue}之间。`;
                        inputHint.style.display = 'block';
                        return false;
                    }
                } else if (item.type == 'switch') {
                    const cfg = item as ui.SwitchConfigItem;
                    cfg.currentValue = (item.domItem as HTMLInputElement).checked;
                } else if (item.type == 'radio') {
                    const cfg = item as ui.RadioConfigItem;
                    cfg.currentValue = '';
                    for (let i = 0; i < cfg.options.length; i++) {
                        const input = item.domItems[i] as HTMLInputElement;
                        if (input.checked) {
                            cfg.currentValue = input.value;
                            break;
                        }
                    }
                    if (!cfg.currentValue) {
                        inputHint.innerText = `${item.name}必须选择一个选项。`;
                        inputHint.style.display = 'block';
                        return false;
                    }
                } else if (item.type == 'checkbox') {
                    const cfg = item as ui.CheckboxConfigItem;
                    cfg.currentValue = [];
                    for (let i = 0; i < cfg.options.length; i++) {
                        const input = item.domItems[i + (cfg.hasAll ? 1 : 0)] as HTMLInputElement;
                        if (input.checked) {
                            cfg.currentValue.push(input.value);
                        }
                    }
                } else if (item.type == 'checkboxWidthSelect') {
                    const cfg = item as ui.CheckWidthSelectConfigItem;
                    cfg.currentValue = [];
                    for (let i = 0; i < cfg.options.length; i++) {
                        const isCheck = (item.domItems[i * 2] as HTMLInputElement).checked;
                        const selected = (item.domItems[i * 2 + 1] as HTMLSelectElement).value;
                        cfg.currentValue.push({isCheck, selected});
                    }
                } else if (item.type == 'select') {
                    const cfg = item as ui.SelectConfigItem;
                    cfg.currentValue = (item.domItem as HTMLSelectElement).value;
                    if (!cfg.currentValue) {
                        inputHint.innerText = `${item.name}必须选择一个选项。`;
                        inputHint.style.display = 'block';
                        return false;
                    }
                } else if (item.type == 'string') {
                    const cfg = item as ui.StringConfigItem;
                    cfg.currentValue = (item.domItem as HTMLInputElement).value;
                    if (cfg.currentValue.length == 0) {
                        inputHint.innerText = `${item.name}的内容不能为空。`;
                        inputHint.style.display = 'block';
                        return false;
                    }
                }
            }
            return true;
        }

        // 用于将数据设置为建议值
        const setSuggestedValue = () => {
            for (const item of param.items) {
                if (item.type == 'number') {
                    const cfg = item as ui.NumberConfigItem;
                    (cfg.domItem as HTMLInputElement).value = cfg.suggestedValue.toString();
                } else if (item.type == 'switch') {
                    const cfg = item as ui.SwitchConfigItem;
                    (item.domItem as HTMLInputElement).checked = cfg.suggestedValue;
                } else if (item.type == 'radio') {
                    const cfg = item as ui.RadioConfigItem;
                    for (let i = 0; i < cfg.options.length; i++) {
                        const input = item.domItems[i] as HTMLInputElement;
                        input.checked = cfg.suggestedValue == input.value;
                    }
                } else if (item.type == 'checkbox') {
                    const cfg = item as ui.CheckboxConfigItem;
                    for (let i = 0; i < cfg.options.length; i++) {
                        const input = item.domItems[i + (cfg.hasAll ? 1 : 0)] as HTMLInputElement;
                        input.checked = cfg.suggestedValue.includes(input.value);
                    }
                } else if (item.type == 'checkboxWidthSelect') {
                    const cfg = item as ui.CheckWidthSelectConfigItem;
                    for (let i = 0; i < cfg.options.length; i++) {
                        (item.domItems[i * 2] as HTMLInputElement).checked = cfg.suggestedValue[i].isCheck;
                        (item.domItems[i * 2 + 1] as HTMLSelectElement).value = cfg.suggestedValue[i].selected;
                    }
                } else if (item.type == 'select') {
                    const cfg = item as ui.SelectConfigItem;
                    (item.domItem as HTMLSelectElement).value = cfg.suggestedValue;
                } else if (item.type == 'string') {
                    const cfg = item as ui.StringConfigItem;
                    (item.domItem as HTMLInputElement).value = cfg.suggestedValue;
                }
            }
        }

        // 显示对话框
        if (!isSwl) {
            return await this.modal({
                title: param.title,
                content: form,
                ok: true,
                cancel: true,
                overlayDisable: true,
                dataVerify,
                exButton: {
                    text: '使用建议值',
                    click: setSuggestedValue,
                    desc: '用建议值填充界面内容，仅供参考',
                },
            });
        }

        // 显示对话框
        const ret = await Swal.fire({
            title: param.title,
            html: form,
            showConfirmButton: true,
            confirmButtonText: '确定',
            showCancelButton: true,
            cancelButtonText: '取消',
            preConfirm: () => {
                if (!dataVerify()) {
                    return false;
                }
            }
        });

        return ret.isConfirmed;
    }
}

export const gUI = new UiTool();
