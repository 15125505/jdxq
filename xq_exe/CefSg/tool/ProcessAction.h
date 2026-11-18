#pragma once
#include <map>
#include <set>

namespace Tool 
{

class CProcessAction
{
public:
	CProcessAction(void);
	~CProcessAction(void);

	// 获取系统中当前所有进程
	struct PInfo 
	{
		std::string strName;
		std::set<int> setChildren;
	};
	static BOOL GetAllProcess(std::map<int, PInfo> &mapProcess);

	// 根据进程ID获取进程的全路径名
	static CString GetProcessModule( DWORD dwPID );

	// 根据进程ID获取进程的全路径名
	static void GetProcessPath(DWORD dwProcessID, CString &strPath);

	// 创建进程并返回进程ID
	static DWORD NewProcess(CString strExe, CString strParam);

	// 关闭指定的进程
	static BOOL KillProcess(DWORD dwPid);

	// 关闭进程以及对应的子进程
	static BOOL KillProcessAndChildren(DWORD dwPid);

	// 检查指定两个进程是否为父子关系
	static BOOL IsTheChild(DWORD dwFather, DWORD dwChild);

	// 杀掉指定位置启动的进程
	static BOOL KillProcess(CString strPathName);
};

}