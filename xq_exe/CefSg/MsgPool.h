/*******************************************************************************
* 版权所有 (C)  2022
* 
* 文件名称： 	MsgPool.h
* 内容摘要： 	用于浏览器向窗口传递消息
* 当前版本： 	V1.0
* 作    者： 	作者
* 完成日期： 	2022-09-23
*******************************************************************************/
#pragma once
#include <string>
#include <vector>
#include <afxmt.h>

class MsgPool
{
public:

	// 进程检查条件
	struct ProcessCheck
	{
		// 类名
		std::string strClassName;

		// 窗口名
		std::string strWindowName;
		
		// 进程名
		std::string strProcessName;

		// 是否在子进程中进行查找
		bool bFindInChildProcess;
	};

	// 数据检查条件
	struct DataCheck
	{
		std::string name;
		std::string begin;
		std::string end;
		std::vector<std::pair<std::string, std::string>> vec;
	};


	// 添加一个消息到消息队列（该函数由浏览器调用）
	static void AddMsg(LPCWSTR lpszMsg);

	// 从消息队列中获取一个消息（该函数由C++部分定时查询）
	static bool GetMsg(std:: string &strMsg);

	// 获取进程检查条件
	static bool GetProcessVec(const std::string& strMsg, std::vector<ProcessCheck>& vec);

	// 获取内存检查条件
	static bool GetDataVec(const std::string& strMsg, std::vector<DataCheck>& vec);

private:

	// 本地消息缓存
	static std::vector<std::string> m_vecMsg;
	static CCriticalSection m_csLock;

	// 解析消息名称
	static std::string ParseName(const std::string& strMsg);

};

