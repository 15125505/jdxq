#include "pch.h"
#include "HttpClientEx.h"
#include <afxsock.h>
#include <vector>
#include "FileEx.h"

#define Log TRACE("\n");TRACE


CHttpClientEx::CHttpClientEx(void)
{
	m_bStop = false;

	//载入libcurl库
	SetDllDirectory((Tool::CFileEx::GetExeDirectory() + "\\dll").c_str());
	HINSTANCE hInst = LoadLibrary("libcurl.dll");
	SetDllDirectory(NULL);
	if (NULL != hInst)
	{
		pcurl_easy_init = (tcurl_easy_init)GetProcAddress(hInst, "curl_easy_init");
		pcurl_easy_setopt = (tcurl_easy_setopt)GetProcAddress(hInst, "curl_easy_setopt");
		pcurl_easy_perform = (tcurl_easy_perform)GetProcAddress(hInst, "curl_easy_perform");
		pcurl_easy_cleanup = (tcurl_easy_cleanup)GetProcAddress(hInst, "curl_easy_cleanup");
		pcurl_easy_strerror = (tcurl_easy_strerror)GetProcAddress(hInst, "curl_easy_strerror");
		pcurl_easy_getinfo = (tcurl_easy_getinfo)GetProcAddress(hInst, "curl_easy_getinfo");
		pcurl_slist_free_all = (tcurl_slist_free_all)GetProcAddress(hInst, "curl_slist_free_all");
		pcurl_slist_append = (tcurl_slist_append)GetProcAddress(hInst, "curl_slist_free_all");
	}
	else
	{
		pcurl_easy_init = NULL;
		pcurl_easy_setopt = NULL;
		pcurl_easy_perform = NULL;
		pcurl_easy_cleanup = NULL;
		pcurl_easy_strerror = NULL;
		pcurl_easy_getinfo = NULL;
		pcurl_slist_free_all = NULL;
		pcurl_slist_append = NULL;
	}

	m_CUrl = NULL;
}

CHttpClientEx::~CHttpClientEx(void)
{
	if (NULL != m_CUrl && NULL != pcurl_easy_cleanup)
	{
		pcurl_easy_cleanup(m_CUrl);
		m_CUrl = NULL;
	}
}


BOOL CHttpClientEx::Request(CString strUrl, const Tool::TBuff<byte>& buff, std::string &strData)
{
	//检查libcurl
	if (NULL == pcurl_easy_init)
	{
		//strErr = _T("网络库初始化失败，请检查是否有文件丢失");
		return FALSE;
	}

	//开始使用curl
	if (NULL == m_CUrl)
	{
		m_CUrl = pcurl_easy_init();;
	}
	if (NULL == m_CUrl)
	{
		//strErr = _T("网络库初始化失败");
		return FALSE;
	}

	//设置目标地址
	std::string szUrl = CT2CA(strUrl);
	pcurl_easy_setopt(m_CUrl, CURLOPT_URL, (LPCSTR)strUrl);

	// 设置代理
	//pcurl_easy_setopt(m_CUrl, CURLOPT_PROXY, "127.0.0.1");
	//pcurl_easy_setopt(m_CUrl, CURLOPT_PROXYPORT, 8888);


	//设置需要发送的内容
	if (buff.size() > 0)
	{
		pcurl_easy_setopt(m_CUrl, CURLOPT_POSTFIELDS, (LPCSTR)&buff[0]);
		pcurl_easy_setopt(m_CUrl, CURLOPT_POSTFIELDSIZE, buff.size());
	}

	//支持zip文件下载
	pcurl_easy_setopt(m_CUrl, CURLOPT_ACCEPT_ENCODING, "gzip");

	//设置UserAgent
	pcurl_easy_setopt(m_CUrl, CURLOPT_USERAGENT, "ZAgent");

	//设置内容读取的回调函数
	strData.clear();
	pcurl_easy_setopt(m_CUrl, CURLOPT_WRITEFUNCTION, HttpCallback);
	pcurl_easy_setopt(m_CUrl, CURLOPT_WRITEDATA, &strData);

	//开始下载
	CURLcode res = pcurl_easy_perform(m_CUrl);


	//如果失败打印返回值
	if (res != CURLE_OK)
	{
		TRACE("%s\n", pcurl_easy_strerror(res));
		return FALSE;
	}

	return TRUE;
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
std::string CHttpClientEx::Utf8ToAnsi(const char *pSrc, int nLen)
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

std::string CHttpClientEx::AnsiToUtf8(const char *pSrc, int nLen)
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


size_t CHttpClientEx::HttpCallback(void *ptr, size_t size, size_t nmemb, void *stream)
{
	if (NULL != stream)
	{
		std::string &str = *(std::string *)stream;
		str.append((const char *)ptr, size * nmemb);
	}
	return size * nmemb;
}
