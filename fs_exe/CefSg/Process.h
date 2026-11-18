#pragma once

#include <string>
#include <afxmt.h>
#include "tool/TBuff.h"
#include "tool/HttpClientEx.h"

class CProcess
{
public:
	CProcess(void);
	~CProcess(void);

	enum ErrCode {
		eGetMachineCodeFail = 10000,
		eGetCodeFromServerNetworkFail,
		eGetFileFromServerNetworkFail,
	};

	// 从服务器获取code
	int GetCode();

	// 从服务器更新index.html
	int UpdateIndex();

	// 从服务器更新main.js
	int UpdateMain();

	// 获取index.html内容
	std::string IndexHtml();

	// 获取main.js内容
	std::string MainJs();

	// 清除缓存中的内容
	void ClearMemFile();

	// 是否为测试版本
	BOOL IsTest() { return m_bIsTest; };

private:

	// 从服务器更新文件到本地
	int GetFile(CString strName);

	// 本地读取文件
	BOOL GetFileContent(LPCSTR lpszFilePath, std::string& sContent);

	// 对内容进行编解码
	void Coded(std::string& strToCode);
	void Coded(std::string& strToCode, Tool::TBuff<byte> &buff);

	// 内存中存储的文件等信息
	std::string m_strCode, m_strIndex, m_strMain;

	// 数据锁
	CCriticalSection m_csLock;

	// http对象
	CHttpClientEx m_http;

	// 是否为测试模式
	BOOL m_bIsTest;

};
