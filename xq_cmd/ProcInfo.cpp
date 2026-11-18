//
// Created by 作者 on 2020/12/3.
//

#include "ProcInfo.h"
#include <ftw.h>
#include <sys/ptrace.h>
#include <dirent.h>
#include <sys/ptrace.h>
#include <sys/wait.h>

#define WRITE_DUMP 0


ProcInfo::ProcInfo() 
{
	m_pDumpFile = nullptr;
}

void ProcInfo::Test() 
{
	ZLog("侦测开始...");

	// 读取进程列表
	std::vector<ProcNode> vec;
	GetProcList(vec);

	// 显示进程列表
	for (size_t i=0; i<vec.size(); i++)
	{
		const auto& node = vec[i];
		Log("----<%03d> 进程<%d> -- <%s>", i, node.nPid, node.strCmd.c_str());
	}


	// 找到需要的进程
	//std::string strToFind = "com.tencent.mm";
	std::string strToFind = "com.tencent.mobileqq:mini3";
	for (size_t i = 0; i < vec.size(); i++)
	{
		const auto& node = vec[i];
		if (node.strCmd.find(strToFind) == strToFind.npos)
		{
			// 找不到这个进程直接返回
			continue;
		}

		Log("----找到的进程 <%03d> 进程<%d> -- <%s>", i, node.nPid, node.strCmd.c_str());
		ZLog("发现一个<%s>...", "QQ小游戏");
#if WRITE_DUMP
		m_pDumpFile = fopen("dump.bin", "w+b");
#endif
		ProcessPid(node.nPid);
		ZLog("<%s>处理结束！", "QQ小游戏");
#if WRITE_DUMP
		if (NULL != m_pDumpFile)
		{
			fclose(m_pDumpFile);
			m_pDumpFile = nullptr;
		}
#endif

		// todo: 临时处理完一个就跳出去
		break;
	}

}


/*******************************************************************************
* 功能描述：	获取当前进程列表
* 输出参数：	vecProc -- 进程列表
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2021-04-22	作者	      	创建
*******************************************************************************/
void ProcInfo::GetProcList(std::vector<ProcNode>& vecProc)
{
	// 打开proc目录
	DIR* dir = opendir("/proc");
	if (dir == nullptr)
	{
		Log("读取/proc失败");
		return;
	}

	// 遍历目录
	struct dirent* entry = nullptr;
	char filename[200];
	char cmdline[256] = { 0 };
	FILE* file = nullptr;
	while ((entry = readdir(dir)) != nullptr)
	{

		// 如果文件名不是数字的，跳过
		int id = atoi(entry->d_name);
		if (id <= 0)
		{
			//Log("文件名：<%s>不是数字", entry->d_name);
			continue;
		}

		// 读取文件内容
		sprintf(filename, "/proc/%d/cmdline", id);
		file = fopen(filename, "r");
		if (!file)
		{
			Log("读取进程<%d>失败！！！", id);
			continue;
		}
		fgets(cmdline, sizeof(cmdline), file);
		fclose(file);

		// 输出文件内容
		ProcNode node;
		node.nPid = id;
		node.strCmd = cmdline;
		vecProc.push_back(node);
	}
	closedir(dir);
}

void ProcInfo::ProcessPid(int nPid)
{
	Log("===========开始处理进程：%d", nPid);

	// 初始化需求
	m_vecProb.clear();
	m_vecProb.push_back(ProbNode("server", 2, "wss://", "/?base64=0"));
	//m_vecProb.push_back(ProbNode("authorCode", 1, "\"authorCode\":\"", "\""));
	m_vecProb.push_back(ProbNode("authorCode", 3, "eyJ1aWQ"));
	m_vecProb.push_back(ProbNode("roleId", 50));
	m_vecProb.push_back(ProbNode("clientId", 50));
	m_vecProb.push_back(ProbNode("deviceId", 50));

	// 内存处理
	MemRead(nPid);


	// 校验结果
	bool bSuccess = true;
	std::string strClientId;
	for (const auto &node : m_vecProb)
	{
		Log("----搜索到<%s><%d>个: <%s>", node.strTag.c_str(), node.nCount, node.strValue.c_str());
		if (node.nCount == 0)
		{
			// todo: 此处需要对不同字段提供不同的说明
			ZLog("----侦测所需的<%s>字段没能成功获取，请重试！", node.strTag.substr(0, 2).c_str());
			bSuccess = false;
			continue;
		}
		if (node.strTag == "clientId")
		{
			strClientId = node.strValue;
		}
	}
	if (!bSuccess)
	{
		return;
	}

	// 加入平台信息的自动识别
	std::string strPlatform = "";
	if (strClientId.find("QQ") != strClientId.npos)
	{
		strPlatform = "QQ";
		if (strClientId.find("fengshj") != strClientId.npos)
		{
			strPlatform = "QQ封神";
		}
	}
	else
	{
		if (strClientId.find("fengshj") != strClientId.npos)
		{
			strPlatform = "封神";
		}
	}

	// 将处理结果整理为需要的内容
	std::string strUserInfo = "{";
	for (size_t i = 0; i < m_vecProb.size(); i++)
	{
		const auto& node = m_vecProb[i];
		strUserInfo += "\"";
		strUserInfo += node.strTag;
		strUserInfo += "\":";
		strUserInfo += node.strValue;
		strUserInfo += ",";
	}

	// 添加附加信息
	strUserInfo += "\"platform\":\"" + strPlatform + "\",";
	strUserInfo += "\"clientVer\":\"192.0.2.1\",";
	strUserInfo += "\"gameId\":129";	
	strUserInfo += "}";

	// 添加校验信息
	int nCRC = 19911209;
	for (const auto &c : strUserInfo)
	{
		nCRC += int(c);
	}
	nCRC *= 17;


	ZLog("userInfo#zf$%s%d", strUserInfo.c_str(), nCRC);
}


/*******************************************************************************
* 功能描述：	读取指定Pid的进程内存数据
* 输入参数：	nPid    -- 进程pid
* 输出参数：	
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2021-04-22	作者	      	创建
*******************************************************************************/
void ProcInfo::MemRead(int nPid) 
{
	// 附加到进程上并暂停进程
	long ptraceResult = ptrace(PTRACE_ATTACH, nPid, NULL, NULL);
	if (ptraceResult < 0)
	{
		Log("无法附加到指定的进程上 %ld - %d", ptraceResult, errno);
		return;
	}
	wait(NULL);

	m_nTotalRead = 0;
	m_nCurRead = 0;
	m_nLastRead = 0;
	m_nTotalCount = 0;
	m_nCurStepSize = 0;

    // 内存map文件
	char mapsFilename[1024];
	sprintf(mapsFilename, "/proc/%d/maps", nPid);
	FILE* pMapsFile = fopen(mapsFilename, "r");

    // 内存文件
	char memFilename[1024];
	sprintf(memFilename, "/proc/%d/mem", nPid);
	FILE* pMemFile = fopen(memFilename, "r");

    // 读取内存map文件
	char line[256];
    int count = 10000000;
	std::vector<LinInfo> vec;
	while (fgets(line, 256, pMapsFile) != NULL && --count > 0)
	{
		// 此处需要过滤一些明显不需要解析的内存块
		if (nullptr == strstr(line, "rw-p")
			|| nullptr != strstr(line, ".art")
			|| nullptr != strstr(line, ".oat")
			|| nullptr != strstr(line, ".so")
			|| nullptr != strstr(line, ".bss")
			|| nullptr != strstr(line, "stack")
			)
		{
			continue;
		}

		// 提取内存信息
		LinInfo node;
		int nCount = sscanf(line, "%lx-%lx", &node.nStart, &node.nEnd);
		if (nCount != 2)
		{
			std::cout << "提取内存块起止信息失败：" << line << std::endl;
			continue;
		}

		// 加入待处理列表
		node.strLine = line;
		vec.push_back(node);
		m_nTotalCount += node.nEnd - node.nStart;
	}
	for (size_t i=0; i<vec.size(); i++)
	{
		const auto& node = vec[i];
		MemRead(pMemFile, node.strLine.c_str(), node.nStart, node.nEnd);
	}

	fclose(pMapsFile);
	fclose(pMemFile);

	Log("---本次处理了<%f>MB的数据，最后一次有效数据在<0x%08lx>", m_nTotalRead / 1000000.0f, m_nLastRead);


    // 恢复进程并解除附加状态
	ptrace(PTRACE_CONT, nPid, NULL, NULL);
	ptrace(PTRACE_DETACH, nPid, NULL, NULL);
}

/*******************************************************************************
* 功能描述：	读取指定内存文件中的一块内存
* 输入参数：	pMemFile		-- 内存文件名
*				szMemLineInfo	-- 该块内存的信息，来自于"/proc/%d/mem"，形如："c7f24000-c7f25000 ---p 00000000 00:00 0          [anon:thread signal stack guard page]"
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2021-08-06	作者	      	创建
*******************************************************************************/
void ProcInfo::MemRead(FILE* pMemFile, const char* szMemLineInfo, unsigned long uStart, unsigned long uEnd)
{
	std::string str = szMemLineInfo;

	// 读取该块内存数据
	unsigned long uStep = 4096;
	unsigned char buff[uStep];
	std::string strTmp;
	fseeko(pMemFile, uStart, SEEK_SET);
	Tool::TBuff<byte> tmpBuff;
	for (unsigned long nCurAddr = uStart; nCurAddr + uStep < uEnd; nCurAddr += uStep)
	{
		m_nCurStepSize += uStep;
		m_nCurRead += uStep;
		if (m_nCurStepSize >= 16 * 1024 * 1024)
		{
			m_nCurStepSize = 0;
			ZLog("rangeUpdate#zf$%.2f", m_nCurRead * 100.0f / m_nTotalCount);
		}
		auto ret = fread(&buff, 1, uStep, pMemFile);
		if (ret == 0)
		{
			continue;
		}
#if WRITE_DUMP
		if (m_pDumpFile)
		{
			fwrite(buff, 1, ret, m_pDumpFile);
		}
#endif
		m_nLastRead = nCurAddr;
		m_nTotalRead += ret;
		strTmp.clear();
		strTmp.append((char*)buff, ret);
		for (size_t i = 0; i < m_vecProb.size(); i++)
		{
			ProbNode& node = m_vecProb[i];
			if (node.IsFinish())
			{
				continue;
			}
			node.lpszMemLine = szMemLineInfo;
			if (node.strBegin.length() == 0)
			{
				// 搜索内容前面加上msgpack编码的数据长度，降低误判
				tmpBuff.clear();
				tmpBuff.append(byte(0xa0 + node.strTag.length()));
				tmpBuff.append((byte*)node.strTag.c_str(), node.strTag.length());
				GetValue(buff, ret, node, tmpBuff);
			}
			else if (node.strEnd.length() != 0)
			{
				GetBetween(strTmp, node);
			}
			else 
			{
				GetByHead(strTmp, node);
			}
		}

#if WRITE_DUMP
		auto pos = strTmp.find("eyJ1");
		//auto pos = strTmp.find("authorCode");
		if (strTmp.npos != pos)
		{
			Log("找到了需要的东西<%s>！！！", strTmp.substr(pos, 50).c_str());
			Log("%s", szMemLineInfo);
		}
#endif

	}
}


/*******************************************************************************
* 功能描述：	读取内存中指定字段的内容
* 输入参数：
* 输出参数：
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2020-05-01	作者	      	创建
*******************************************************************************/
#define CHECK_LEN(len) if (i + len > nLen) {Log("缓冲区已经读取完了！"); break;}
#define READ_NUM(t) CHECK_LEN(sizeof(t)); ChangeBuf(pBuff + i, sizeof(t)); t v = *(t *)(pBuff + i); i+=sizeof(t);
#define READ_STR(t) READ_NUM(t); CHECK_LEN(v); std::string str; str.append((char *)(pBuff + i), v); i += v;
BOOL ProcInfo::GetValue(byte* pBuff, size_t nLen, ProbNode& node, Tool::TBuff<byte>& buff)
{
	char strValue[256];

	// 保证起始字段后面有足够的长度
	for (size_t i = 0; i < nLen - buff.size() - 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < buff.size(); j++)
		{
			if (pBuff[i + j] != byte(buff[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}

		// 找到了匹配的位置，读取一个字节
		i += buff.size();
		byte flag = pBuff[i++];

		// 根据flag解析内容
		if (flag >= 0 && flag <= 127)
		{
			sprintf(strValue, "%d", flag);
			node.Add(strValue);
		}
		else if (flag >= 160 && flag <= 191)
		{
			size_t v = flag - 160;
			CHECK_LEN(v);
			std::string str;
			str.append((char*)(pBuff + i), v);
			i += v;
			sprintf(strValue, "\"%s\"", str.c_str());
			node.Add(strValue);
		}
		else if (flag == 204)
		{
			READ_NUM(byte);
			sprintf(strValue, "%u", v);
			node.Add(strValue);
		}
		else if (flag == 205)
		{
			READ_NUM(WORD);
			sprintf(strValue, "%u", v);
			node.Add(strValue);
		}
		else if (flag == 206)
		{
			READ_NUM(DWORD);
			sprintf(strValue, "%lu", v);
			node.Add(strValue);
		}
		else if (flag == 207)
		{
			READ_NUM(UINT64);
			sprintf(strValue, "%lld", v);
			node.Add(strValue);
		}
		else if (flag == 208)
		{
			READ_NUM(char);
			sprintf(strValue, "%d", v);
			node.Add(strValue);
		}
		else if (flag == 209)
		{
			READ_NUM(short);
			sprintf(strValue, "%d", v);
			node.Add(strValue);
		}
		else if (flag == 210)
		{
			READ_NUM(int);
			sprintf(strValue, "%d", v);
			node.Add(strValue);
		}
		else if (flag == 211)
		{
			READ_NUM(INT64);
			sprintf(strValue, "%lld", v);
			node.Add(strValue);
		}
		else if (flag == 217)
		{
			READ_STR(byte);
			sprintf(strValue, "\"%s\"", str.c_str());
			node.Add(strValue);
		}
		else if (flag == 218)
		{
			READ_STR(WORD);
			sprintf(strValue, "\"%s\"", str.c_str());
			node.Add(strValue);
		}
		else if (flag == 219)
		{
			READ_STR(DWORD);
			sprintf(strValue, "\"%s\"", str.c_str());
			node.Add(strValue);
		}
	}

	return TRUE;
}

/*******************************************************************************
* 功能描述：	读取指定字符串之间的内容
* 输入参数：	pBuff		-- 需要读取的原始内存
*				nLen		-- 原始内存长度
*				node		-- 包含带搜索信息的节点
* 输出参数：	node		-- 搜索结果也在该节点中处理
* 返 回 值：	执行成功返回TRUE，否则返回FALSE。
* 其它说明：	
* 修改日期		修改人			修改内容
* ------------------------------------------------------------------------------
* 2021-08-06	作者	      	创建
*******************************************************************************/
BOOL ProcInfo::GetBetween(byte* pBuff, size_t nLen, ProbNode& node)
{
	// 找到字段1的位置
	size_t pos1 = -1, pos2 = -1;
	for (size_t i = 0; i < nLen - node.strBegin.length() + 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < node.strBegin.length(); j++)
		{
			if (pBuff[i + j] != byte(node.strBegin[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}
		pos1 = i;
		break;
	}
	if (pos1 == -1)
	{
		return FALSE;
	}
	pos1 += node.strBegin.length();

	// 找到字段2的位置
	for (size_t i = pos1; i < nLen - node.strEnd.length() + 1; i++)
	{
		// 找到匹配的位置
		BOOL bSame = TRUE;
		for (size_t j = 0; j < node.strEnd.length(); j++)
		{
			if (pBuff[i + j] != byte(node.strEnd[j]))
			{
				bSame = FALSE;
				break;
			}
		}
		if (!bSame)
		{
			continue;
		}
		pos2 = i;
		break;
	}
	if (pos2 == -1)
	{
		return FALSE;
	}

	// 读取字符串内容
	std::string strRet;
	strRet.append((char*)pBuff + pos1, pos2 - pos1);


	auto badPos = strRet.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=:-.?");
	if (badPos != std::string::npos)
	{
		//WLog("找到乱码");
		return FALSE;
	}
	if (strRet.length() > 0)
	{
		node.Add("\"" + strRet + "\"");
	}

	return TRUE;
}

BOOL ProcInfo::GetBetween(const std::string& strSrc, ProbNode& node)
{
	size_t nStart = strSrc.find(node.strBegin);
	if (nStart == strSrc.npos)
	{
		return FALSE;
	}
	nStart += node.strBegin.size();
	size_t nEnd = strSrc.find(node.strEnd, nStart);
	if (nEnd == strSrc.npos)
	{
		//Log("-------没有找到末尾的数据");
		return FALSE;
	}
	std::string strRet = strSrc.substr(nStart, nEnd - nStart);
	auto badPos = strRet.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=:-.?");
	if (badPos != std::string::npos)
	{
		//Log("-------找到乱码");
		return FALSE;
	}
	if (strRet.length() > 0)
	{
		node.Add("\"" + strRet + "\"");
	}
	return TRUE;
}

BOOL ProcInfo::GetByHead(const std::string& strSrc, ProbNode& node)
{
	size_t nStart = strSrc.find(node.strBegin);
	if (nStart == strSrc.npos || nStart < 4)
	{
		return FALSE;
	}

	// 前面两个字节一定是0
	if (strSrc[nStart - 1] != 0 || strSrc[nStart - 2] != 0)
	{
		return FALSE;
	}

	// 再前面两个字节是长度
	size_t nLen = size_t(strSrc[nStart - 3]) * 256 + size_t(strSrc[nStart - 4]);
	if (nStart + nLen >= strSrc.size() || nLen > 1000)
	{
		return FALSE;
	}
	node.Add("\"" + strSrc.substr(nStart, nLen) + "\"");
	return TRUE;
}

