//
// Created by 作者 on 2020/12/3.
//

#ifndef CPP_APPLICATION_PROCINFO_H
#define CPP_APPLICATION_PROCINFO_H


#include <sys/stat.h>
#include <string>
#include <map>
#include <vector>
#include <iostream>
#include "TBuff.h"

// 一些MFC的宏
#define FALSE   0
#define TRUE    1
typedef unsigned char		byte;
typedef const char*			LPCSTR;
typedef unsigned long       DWORD;
typedef int                 BOOL;
typedef unsigned char       BYTE;
typedef unsigned short      WORD;
typedef signed long long    INT64;
typedef unsigned long long  UINT64;

// 日志输出
#define Log(...) printf(__VA_ARGS__); std::cout << std::endl;

// 需要给用户显示的日志
#define ZLog(...) printf("<[zflog-0"); printf(__VA_ARGS__); std::cout << std::endl;		
#define ZInfo(...) printf("<[zflog-1"); printf(__VA_ARGS__); std::cout << std::endl;		
#define ZNotice(...) printf("<[zflog-2"); printf(__VA_ARGS__); std::cout << std::endl;		
#define ZWarn(...) printf("<[zflog-3"); printf(__VA_ARGS__); std::cout << std::endl;		
#define ZErr(...) printf("<[zflog-4"); printf(__VA_ARGS__); std::cout << std::endl;		


class ProcInfo {

public:

    // 构造函数
    ProcInfo();

    // 测试函数
    void Test();

private:

	// 进程节点
	struct ProcNode
	{
		int nPid;           // 进程Pid
		std::string strCmd; // 进程对应的命令行，也就是这个包名
	};

	// 探测信息节点
	struct ProbNode
	{
		std::string strTag;							// tag名称
		std::string strBegin;						// 需要查找头尾的tag头(如果该字段不为空，表示需要查找begin和end之间的内容)
		std::string strEnd;							// 需要查找头尾的tag尾
		std::map<std::string, int> mapValueCount;	// 目前找出来的值
		std::string strValue;						// 当前找出来的出现次数最多的值
		int nCount;									// 当前出现最多的次数
		int nValidCount;							// 当前字段侦测到这个数量就够了
		LPCSTR	lpszMemLine;

		ProbNode(LPCSTR lpszTagName, int validCount, LPCSTR lpszBegin = "", LPCSTR lpszEnd = "")
		{
			nValidCount = validCount;
			nCount = 0;
			strTag = lpszTagName;
			strBegin = lpszBegin;
			strEnd = lpszEnd;
			lpszMemLine = nullptr;
		}

		void Clear()
		{
			mapValueCount.clear();
			nCount = 0;
		}

		bool IsFinish()
		{
			return nCount >= nValidCount;
		}

		void Add(std::string v)
		{
			int nCurCount = mapValueCount[v];
			mapValueCount[v] = ++nCurCount;
			if (nCurCount > nCount)
			{
				nCount = nCurCount;
				strValue = v;
			}
			printf("---有所发现：<%s>\n", lpszMemLine);
			printf("------------当前侦测到<%s><%d>个，当前值为<%s>，最大值<%s>\n", strTag.c_str(), nCount, v.c_str(), strValue.c_str());
			//LogI("%s#zf$%s", strTag.c_str(), strValue.c_str());
		}
	};

	// 当前进程的进度信息
	size_t m_nTotalRead;		// 当前已经成功读取的总直接
	size_t m_nCurRead;			// 当前已读总字节（无论是否读取成功，用于计算进度）
	size_t m_nCurStepSize;		// 当前已读总字节（无论是否读取成功，用于计算进度），和上一个数据相比，这个每隔几M数据就归零
	size_t m_nTotalCount;		// 需要读取的总字节
	unsigned long m_nLastRead;

	// 用于保存dump数据的文件
	FILE* m_pDumpFile;

	// 一行需要处理的数据
	struct LinInfo
	{
		unsigned long nStart, nEnd;
		std::string strLine;
	};


	// 当前需要进行处理的节点列表
	std::vector<ProbNode> m_vecProb;

	// 获取当前进程列表
	void GetProcList(std::vector<ProcNode>& vecProc);

	// 处理指定的进程
	void ProcessPid(int nPid);

    // 读取指定进程的内存
	void MemRead(int nPid);

    // 读取指定内存文件中的一块内存
    void MemRead(FILE* pMemFile, const char* szMemLineInfo, unsigned long uStart, unsigned long uEnd);

	// 读取字段内容
	BOOL GetValue(byte* pBuff, size_t nLen, ProbNode& strTag, Tool::TBuff<byte>& buff);

	// 读取指定字符串之间的内容
	BOOL GetBetween(byte* pBuff, size_t nLen, ProbNode& node);

	// 读取指定字符串之间的内容
	BOOL GetBetween(const std::string &strSrc, ProbNode& node);

	// 根据头部信息获取整段数据
	BOOL GetByHead(const std::string& strSrc, ProbNode& node);

	// 修改字节序
	void ChangeBuf(byte* pBuff, size_t nLen)
	{
		for (size_t i = 0; i < nLen / 2; i++)
		{
			byte t = pBuff[i];
			pBuff[i] = pBuff[nLen - i - 1];
			pBuff[nLen - i - 1] = t;
		}
	}
};


#endif //CPP_APPLICATION_PROCINFO_H
