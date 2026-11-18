#pragma once
#include <map>
#include <string>
#include "TBuff.h"

class CHttpReq
{
public:
	CHttpReq(void);
	~CHttpReq(void);

	//获取指定的Url的内容
	BOOL Request(CString strUrl, std::string &strData, CString &strErr);

	//Post并获取反馈
	BOOL Request(CString strUrl, const Tool::TBuff<byte>& buffPost, std::string &strData, CString &strErr);

	//发送指定的Http命令并获取内容
	BOOL RequestEx(
		CString strUrl,				//目标地址，如https://resource.example.invalid/REDACTED
		CString &strRetHead,		//反馈的Http头
		std::string &strRetBody,	//反馈的内容
		CString &strErr,			//错误信息
		BOOL bPost,					//是否为Post指令
		const Tool::TBuff<byte>& buffPost,		//需要发出去的内容（只有Post指令有这个字段）
		CString strCookie = "",		//初始Cookie信息
		CString strRefer = ""		//参考页面
		);

	//快速停止
	void QStop() { m_bStop = true;}

	//将UTF8转为Anis
	static std::string Utf8ToAnsi(const char *pSrc, int nLen);

	//将Anis转为UTF8
	static std::string AnsiToUtf8(const char *pSrc, int nLen);

private:

	//停止控制变量
	volatile bool m_bStop;

};
