#include "pch.h"
#include "Process.h"
#include "Tool\FileEx.h"
#include "hash\rlz_id.h"

//#define SERVER_ADDR		CString("http://server-1.example.invalid:2012")											// 服务器地址
//#define SERVER_ADDR		CString("http://192.0.2.1:5000")											// 服务器地址
#define SERVER_ADDR		CString("http://server-2.example.invalid")											// 服务器地址
//#define SERVER_ADDR		CString("http://127.0.0.1:5000")											// 服务器地址，用于本地测试
//#define SERVER_ADDR		CString("http://192.0.2.1:5000")											// 服务器地址，用于本地测试并且可以用于抓包


#define Log			TRACE("\n");TRACE
#define Info		TRACE("\n");TRACE
#define Notice		TRACE("\n");TRACE
#define Warn		TRACE("\n");TRACE


CProcess::CProcess(void)
{
	ClearMemFile();

	// 更新测试标志状态
	std::string sContent;
	m_bIsTest = GetFileContent(R"(\dll\mode.dll)", sContent) && sContent == "I am test.";
}

CProcess::~CProcess(void)
{
}

/*******************************************************************************
* 功能描述：	从服务器获取code
* 输入参数：	
* 输出参数：	
* 返 回 值：	执行成功返回，否则返回其他值。
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2019-02-21	作者	      	创建
*******************************************************************************/
int CProcess::GetCode()
{
	// 获取机器码
	std::string szMachineId;
	if (!GetMachineId(&szMachineId))
	{
		return eGetMachineCodeFail;
	}

	// 计算校验码
	int nKey = (int)(GetTickCount() % 10000000);
	CString strSN;
	strSN.Format("%s%d", szMachineId.c_str(), nKey);
	int nMyCheck = int(((nKey % 10000) * 1314 + 15125505) / 11.0 * 10);
	for (int i = 0; i < strSN.GetLength(); i++) 
	{
		nMyCheck += int(strSN[i]);
	}

	// 准备需要发送的数据
	CString strSend;
	strSend.Format(R"({"name":"GetCode","machineId":"%s","tick":"%d","check":"%d"})", szMachineId.c_str(), nKey, nMyCheck);

	// 对数据进行加密
	Tool::TBuff<byte> buff;
	std::string strCode((LPCSTR)strSend);
	Coded(strCode, buff);

	// 发起服务器请求
	CString strErr;
	std::string strContent;
	BOOL bRet = m_http.Request(SERVER_ADDR + "/fileCmd", buff, strContent);
	if (!bRet || strContent.length() <= 3)
	{
		Warn("请求服务器出错：%s", strErr);
		return eGetCodeFromServerNetworkFail;
	}

	// 解密数据
	Coded(strContent);
	m_strCode = strContent;
	return 0;
}


int CProcess::UpdateIndex()
{
	TRACE("更新index.html...\n");
	return GetFile("index.html");
}

int CProcess::UpdateMain()
{
	TRACE("更新main.js...\n");
	return GetFile("main.js");
}

std::string CProcess::IndexHtml()
{
	m_csLock.Lock();
	std::string strRet = m_strIndex;
	m_csLock.Unlock();
	return strRet;
}

std::string CProcess::MainJs()
{
	m_csLock.Lock();
	std::string strRet = m_strMain;
	m_csLock.Unlock();
	return strRet;
}

void CProcess::ClearMemFile()
{
	m_csLock.Lock();
	m_strMain = "";
	m_strIndex = R"(<h1>Something wrong...</h1>)";
	m_csLock.Unlock();
}

/*******************************************************************************
* 功能描述：	从服务器更新文件到本地
* 输入参数：	strName		-- 文件名；
* 输出参数：	strErr		-- 如果失败，此处显示错误信息；
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2019-02-22	作者	      	创建
*******************************************************************************/
int CProcess::GetFile(CString strName)
{
	// 首先尝试读取本地文件
	std::string sContent;
	if (!GetFileContent(R"(\..\xq_js\dist\)" + strName, sContent))
	{
		// 准备需要发送的数据
		CString strSend;
		strSend.Format(R"({"name":"GetFile","code":"%s","fileName":"%s"})", m_strCode.c_str(), strName);
		if (IsTest())
		{
			strSend.Format(R"({"name":"GetFile","code":"%s","fileName":"test_%s"})", m_strCode.c_str(), strName);
		}

		// 对数据进行加密
		Tool::TBuff<byte> buff;
		std::string strCode((LPCSTR)strSend);
		Coded(strCode, buff);

		// 发起服务器请求
		CString strErr;
		std::string strContent;
		BOOL bRet = m_http.Request(SERVER_ADDR + "/fileCmd", buff, strContent);
		if (!bRet || strContent.length() <= 3)
		{
			return eGetFileFromServerNetworkFail;
		}

		// 数据解密
		Coded(strContent);
		sContent = strContent;
	}

	// 保存数据到内存
	m_csLock.Lock();
	if (strName == "index.html")
	{
		m_strIndex = sContent;
	}
	else if (strName == "main.js")
	{
		m_strMain = sContent;
	}
	m_csLock.Unlock();

	return 0;
}


// 获取指定文件的内容
BOOL CProcess::GetFileContent(LPCSTR lpszFilePath, std::string& sContent)
{
	// 设置当前目录为exe目录
	std::string strFolder = Tool::CFileEx::GetExeDirectory().c_str();

	// 首先读取文件
	Tool::TBuff<byte> bufEncode;
	byte buff[1024];
	size_t nRead = 0;
	FILE* pFile = NULL;
	std::string strFile = strFolder + lpszFilePath;
	fopen_s(&pFile, strFile.c_str(), "rb");
	if (NULL == pFile)
	{
		return FALSE;
	}

	// 读取所有内容
	while (nRead = fread_s(buff, 1024, 1, 1024, pFile))
	{
		bufEncode.append(buff, nRead);
	}
	fclose(pFile);
	sContent.clear();
	sContent.append((char*)&bufEncode[0], bufEncode.size());
	return TRUE;
}

void CProcess::Coded(std::string& strToCode)
{
	Tool::TBuff<byte> buff;
	Coded(strToCode, buff);
}

void CProcess::Coded(std::string& strToCode, Tool::TBuff<byte>& buff)
{
	buff.clear();
	buff.append((byte*)strToCode.data(), strToCode.size());
	for (size_t i = 0; i < buff.size(); i++)
	{
		buff[i] ^= 0x82;
	}
	strToCode.clear();
	strToCode.append((char*)&buff[0], buff.size());
}
