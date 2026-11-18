declare namespace data {

    /**
     * 用户信息
     */
    interface User {
        platform: string;
        roleId: string;
        password?: string;
        request?: { platform: string; roleId: string; }[];
        agree?: { platform: string; roleId: string; }[];
    }

}
