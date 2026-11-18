#pragma once


#include <string>
#include "../curl/curl.h"
#include "TBuff.h"

class CHttpClientEx
{
public:
	CHttpClientEx(void);
	~CHttpClientEx(void);

	//发送指定的Http命令并获取内容
	BOOL Request(
		CString strUrl,				//请求的Url地址
		const Tool::TBuff<byte> &buff, //Post的内容（为空表示无Post内容）
		std::string &strData		//收到的Http正文
		);

	//停止当前的操作
	void Stop(){m_bStop = true;}

	//将UTF8转为Anis
	static std::string Utf8ToAnsi(const char *pSrc, int nLen);
	static std::string AnsiToUtf8(const char *pSrc, int nLen);

private:

	//Http回掉函数
	static size_t HttpCallback(void *ptr, size_t size, size_t nmemb, void *stream);

	//停止标志位
	volatile bool m_bStop;

	//连接相关
	CURL *m_CUrl;

	//CUrl的各个函数类型定义
	typedef CURL *(*tcurl_easy_init)(void);
	typedef CURLcode(*tcurl_easy_setopt)(CURL *curl, CURLoption option, ...);
	typedef CURLcode(*tcurl_easy_perform)(CURL *curl);
	typedef void(*tcurl_easy_cleanup)(CURL *curl);
	typedef const char *(*tcurl_easy_strerror)(CURLcode);
	typedef CURLcode(*tcurl_easy_getinfo)(CURL *curl, CURLINFO info, ...);
	typedef void(*tcurl_slist_free_all)(struct curl_slist *);
	typedef struct curl_slist* (*tcurl_slist_append)(struct curl_slist*, const char*);

	//CUrl的各个函数
	tcurl_easy_init pcurl_easy_init;
	tcurl_easy_setopt pcurl_easy_setopt;
	tcurl_easy_perform pcurl_easy_perform;
	tcurl_easy_cleanup pcurl_easy_cleanup;
	tcurl_easy_strerror pcurl_easy_strerror;
	tcurl_easy_getinfo pcurl_easy_getinfo;
	tcurl_slist_free_all pcurl_slist_free_all;
	tcurl_slist_append pcurl_slist_append;


};
