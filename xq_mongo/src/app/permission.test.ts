import {Permission} from "./permission";

test('权限测试', async () => {

    const permission = new Permission();

    const userA = {
        platform: 'xq',
        roleId: 'A',
        code: '00000000000000000000000000000000',
        hash: '00000000000000000000000000000000'
    };
    const userB = {platform: 'xq', roleId: 'B', code: '', hash: ''};
    const userC = {platform: 'xq', roleId: 'C', code: '', hash: ''};


    // 将用户A的密码设置为123456
    await permission.onSetPassword({...userA, newPassword: '123456'});

    // 查看用户A的权限信息
    const list = await permission.onRequestList(userA);
    console.log('用户A的权限信息：', list);

    // 用户B和用户C向A请求权限
    await permission.onRequestPermission({...userB, dstPlatform: userA.platform, dstRoleId: userA.roleId});
    await permission.onRequestPermission({...userC, dstPlatform: userA.platform, dstRoleId: userA.roleId});
    console.log('用户A的权限信息：', JSON.stringify(await permission.onRequestList(userA)));

    // 用户A同意B拒绝C
    await permission.onAgree({
        ...userA,
        users: [
            {...userB, agree: true},
            {...userC, agree: false},
        ]
    })
    console.log('用户A的最终权限信息：', JSON.stringify(await permission.onRequestList(userA)));
});


test('查询数据库', async () => {
    const permission = new Permission();
    const userA = {
        platform: 'xq',
        roleId: 'A',
        code: '00000000000000000000000000000000',
        hash: '00000000000000000000000000000000'
    };
    const userB = {platform: 'xq', roleId: 'B', code: '', hash: ''};
    const userC = {platform: 'xq', roleId: 'C', code: '', hash: ''};

    const result = await permission.onQuerySetting({...userB, dstPlatform: userA.platform, dstRoleId: userA.roleId});
    console.log('查询结果：', result)
});

