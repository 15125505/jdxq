declare namespace ui {

    /**
     * 配置项
     */
    interface ConfigItem {
        name: string;               // 名称，显示在配置页面中
        type: 'number' | 'switch' | 'radio' | 'checkbox' | 'checkboxWidthSelect' | 'select' | 'string';  // 类型，用于区分配置项的类型
        desc?: string;              // 描述，用于对配置项进行进一步说明
        domItem?: HTMLElement;      // 对应的dom元素
        domItems?: HTMLElement[];   // 对应的dom元素
        [key: string]: any;         // 其他配置项
    }

    /**
     * 数值配置项
     */
    interface NumberConfigItem extends ConfigItem {
        currentValue: number;   // 当前值
        suggestedValue: number; // 建议值
        minValue: number;       // 最小值
        maxValue: number;       // 最大值
    }

    /**
     * 开关配置项
     */
    interface SwitchConfigItem extends ConfigItem {
        currentValue: boolean;      // 当前值
        suggestedValue: boolean;    // 建议值
        label: string;              // 标签
    }

    /**
     * 单选配置项
     */
    interface RadioConfigItem extends ConfigItem {
        currentValue: string;   // 当前值
        suggestedValue: string; // 建议值
        options: {
            name: string,       // 用户看见的名称
            value: string,      // 实际值
        }[];
    }

    /**
     * 多选配置项
     */
    interface CheckboxConfigItem extends ConfigItem {
        hasAll: boolean;        // 是否有全选
        currentValue: string[]; // 当前值
        suggestedValue: string[]; // 建议值
        options: {
            name: string,       // 用户看见的名称
            value: string,      // 实际值
        }[];
    }

    /**
     * 带下拉框的配置项
     */
    interface CheckWidthSelectConfigItem extends ConfigItem {
        currentValue: {
            isCheck: boolean,   // 是否勾选
            selected: string,   // 选中的值
        }[];                    // 当前值
        suggestedValue: {
            isCheck: boolean,   // 是否勾选
            selected: string,   // 选中的值
        }[];                    // 建议值
        options: {
            name: string,       // 用户看见的名称
            options: {
                name: string,   // 用户看见的名称
                value: string,  // 实际值
            }[],
        }[];                    // 选项
    }

    /**
     * 下拉框配置项
     */
    interface SelectConfigItem extends ConfigItem {
        currentValue: string;   // 当前值
        suggestedValue: string; // 建议值
        options: {
            name: string,       // 用户看见的名称
            value: string,      // 实际值
        }[];      // 选项
    }

    /**
     * 字符串配置项
     */
    interface StringConfigItem extends ConfigItem {
        currentValue: string;   // 当前值
        suggestedValue: string; // 建议值
    }

    /**
     * 模态对话框配置项
     */
    interface ModalOption {
        content: string | HTMLElement;      // 内容，支持html
        title?: string;                     // 标题
        dataVerify?: () => boolean;         // 数据验证函数，返回true表示数据验证通过，如果返回false，会阻止对话框关闭
        ok?: boolean;                       // 是否显示确定按钮
        cancel?: boolean;                   // 是否显示取消按钮
        exButton?: {                       // 额外的按钮
            text: string;                   // 按钮文本
            desc: string;                   // 按钮描述
            click: () => void;              // 点击事件
        };
        overlayDisable?: boolean;           // 是否禁用点击遮罩层关闭窗口，设置为true时无法点击遮罩层关闭窗口
    }

    /**
     * 获取用户输入的配置项
     */
    interface UserParam {
        title: string;          // 标题
        items: ConfigItem[];    // 配置项
    }

}
