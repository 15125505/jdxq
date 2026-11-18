#include "pch.h"
#include "HttpReq.h"
#include <afxinet.h>
#include <vector>
#include "TBuff.h"

#ifdef _DEBUG
#else
#endif

CHttpReq::CHttpReq(void)
{
}

CHttpReq::~CHttpReq(void)
{
}


BOOL CHttpReq::Request(CString strUrl, std::string &strData, CString &strErr)
{
	CString strRetHead;
	Tool::TBuff<byte> buff;
	return RequestEx(strUrl, strRetHead, strData, strErr, FALSE, buff, "", "");
}

BOOL CHttpReq::Request( CString strUrl, const Tool::TBuff<byte> &buffPost, std::string &strData, CString &strErr )
{
	CString strRetHead;
	return RequestEx(strUrl, strRetHead, strData, strErr, TRUE, buffPost, "", "");
}

BOOL CHttpReq::RequestEx(CString strUrl, CString &strRetHead, std::string &strRetBody, CString &strErr, BOOL bPost, const Tool::TBuff<byte>& buffPost, CString strCookie, CString strRefer)
{
	//解析地址
	DWORD dwServiceType;
	CString strServer;
	CString strObject;
	WORD nPort;
	if (!AfxParseURL(strUrl, dwServiceType, strServer, strObject, nPort))
	{
		strErr = "Url地址格式错误";
		return FALSE;
	}

	//设置超时时间
	CInternetSession session("Mozilla/8.0 (compatible; The King of the world)");
	session.SetOption(INTERNET_OPTION_CONNECT_TIMEOUT, 10000);	//网络连接超时
	session.SetOption(INTERNET_OPTION_SEND_TIMEOUT, 10000);		//发送请求的超时时间
	session.SetOption(INTERNET_OPTION_RECEIVE_TIMEOUT, 10000);	//接受数据的超时时间
	session.SetOption(INTERNET_OPTION_CONNECT_BACKOFF, 100);	//两次重试之间的间隔时间
	session.SetOption(INTERNET_OPTION_CONNECT_RETRIES, 2);		//超时重试次数，默认值是5

	//开始下载
	DWORD dwRetCode = 0;
	m_bStop = false;
	CHttpConnection *pConnection = NULL;
	CHttpFile *pFile = NULL;
	BOOL bRet = TRUE;
	TRY 
	{
		//获取HttpConnect对象
		DWORD dwFlag = INTERNET_FLAG_RELOAD | INTERNET_FLAG_DONT_CACHE;
		if (dwServiceType == AFX_INET_SERVICE_HTTPS)
		{
			dwFlag |= INTERNET_FLAG_SECURE;
		}
		pConnection = session.GetHttpConnection(strServer, dwFlag, nPort, 0, 0);

		//获取HttpFile对象(禁用Cookie)
		dwFlag |= INTERNET_FLAG_EXISTING_CONNECT | INTERNET_FLAG_NO_COOKIES; 
		if (dwServiceType == AFX_INET_SERVICE_HTTPS)
		{
			dwFlag |= INTERNET_FLAG_SECURE;
		}
		pFile = pConnection->OpenRequest(
			!bPost ? CHttpConnection::HTTP_VERB_GET : CHttpConnection::HTTP_VERB_POST,
			strObject, NULL, 1, NULL, NULL, dwFlag
			); 

		//设置数据头
		pFile->AddRequestHeaders("Accept: */*", HTTP_ADDREQ_FLAG_ADD);
		pFile->AddRequestHeaders("Accept-Language: zh-CN", HTTP_ADDREQ_FLAG_ADD);
		if (!strRefer.IsEmpty())
		{
			pFile->AddRequestHeaders(CString("Referer: ") + strRefer, HTTP_ADDREQ_FLAG_ADD);
		}
		//pFile->AddRequestHeaders("Content-Type: application/x-www-form-urlencoded", HTTP_ADDREQ_FLAG_ADD);
		pFile->AddRequestHeaders("Accept-Encoding: gzip, deflate", HTTP_ADDREQ_FLAG_ADD);
		pFile->AddRequestHeaders("Connection: Keep-Alive", HTTP_ADDREQ_FLAG_ADD);
		pFile->AddRequestHeaders("Cache-Control: no-cache", HTTP_ADDREQ_FLAG_ADD);
		if (!strCookie.IsEmpty())
		{
			CString str = "Cookie: " + strCookie;
			pFile->AddRequestHeaders(str, HTTP_ADDREQ_FLAG_ADD);
		}

		//发送请求
		pFile->SendRequest(NULL, 0, (LPVOID)&buffPost[0], buffPost.size());

		//获取返回的状态码
		pFile->QueryInfo(HTTP_QUERY_STATUS_CODE, dwRetCode);


		//获取文件总长度
		CString strInfo;
		pFile->QueryInfo(HTTP_QUERY_CONTENT_LENGTH, strInfo);
		int nFileLen = atoi(strInfo);

		//获取发出去的Header(测试代码，用于校验)
		//CString strSend;
		//pFile->QueryInfo(HTTP_QUERY_RAW_HEADERS_CRLF | HTTP_QUERY_FLAG_REQUEST_HEADERS, strSend);

		//获取反馈的Header
		pFile->QueryInfo(HTTP_QUERY_RAW_HEADERS_CRLF, strRetHead);

		//读取反馈
		char buff[10240];
		strRetBody.clear();
		while (!m_bStop)
		{
			UINT nRead = pFile->Read(buff, 10240);
			if (0 == nRead)
			{
				break;
			}
			strRetBody.append(buff, nRead);
		}

		//ASSERT((int)strRetBody.size() == nFileLen);
	}
	CATCH_ALL (e)
	{
		bRet = FALSE;
		e->GetErrorMessage(strErr.GetBufferSetLength(500), 500);
		strErr.ReleaseBuffer();
		//e->ReportError();
	}
	END_CATCH_ALL;

	//释放资源
	if (NULL != pFile)
	{
		pFile->Close();
		delete pFile;
	}
	if (NULL != pConnection)
	{
		pConnection->Close();
		delete pConnection;
	}

	if (dwRetCode != 200)
	{
		bRet = FALSE;
		strErr.Format("%d错误", dwRetCode);
	}
	return bRet;
}



/*******************************************************************************
* 功能描述：	将Utf8字符串，转化为Ansi字符串。
* 输入参数：	lpszText
* 输出参数：	
* 返 回 值：	返回对应的Ansi字符串。
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2013-02-26	作者	      	创建
*******************************************************************************/
std::string CHttpReq::Utf8ToAnsi(const char *pSrc, int nLen)
{
	if (nLen == 0)
	{
		return "";
	}

	//计算需要的Unicode字符长度
	int nCount = MultiByteToWideChar(CP_UTF8, 0, pSrc, nLen, NULL, 0);
	std::vector<WCHAR> vecTmp;
	vecTmp.resize(nCount);

	//将UTF-8转为Unicode
	MultiByteToWideChar(CP_UTF8, 0, pSrc, nLen, &vecTmp[0], nCount);

	//计算需要的Ansi字符长度
	nCount = WideCharToMultiByte(CP_ACP, 0, &vecTmp[0], vecTmp.size(), NULL, 0, 0, 0);;
	std::vector<char> vecAnsi;
	vecAnsi.resize(nCount);

	//将Unicode转为Ansi
	WideCharToMultiByte(CP_ACP, 0, &vecTmp[0], vecTmp.size(), &vecAnsi[0], nCount, 0, 0);

	//反馈结果
	std::string strRet;
	strRet.append(&vecAnsi[0], nCount);
	char *pChar = &vecAnsi[0];
	return strRet;
}

std::string CHttpReq::AnsiToUtf8(const char *pSrc, int nLen)
{
	if (nLen == 0)
	{
		return "";
	}

	//计算需要的Unicode字符长度
	int nCount = MultiByteToWideChar(CP_ACP, 0, pSrc, nLen, NULL, 0);
	std::vector<WCHAR> vecTmp;
	vecTmp.resize(nCount);

	//将Ansi转为Unicode
	MultiByteToWideChar(CP_ACP, 0, pSrc, nLen, &vecTmp[0], nCount);

	//计算需要的Utf8字符长度
	nCount = WideCharToMultiByte(CP_UTF8, 0, &vecTmp[0], vecTmp.size(), NULL, 0, 0, 0);;
	std::vector<char> vecAnsi;
	vecAnsi.resize(nCount);

	//将Unicode转为Utf8
	WideCharToMultiByte(CP_UTF8, 0, &vecTmp[0], vecTmp.size(), &vecAnsi[0], nCount, 0, 0);

	//反馈结果
	std::string strRet;
	strRet.append(&vecAnsi[0], nCount);
	char *pChar = &vecAnsi[0];
	return strRet;
}
