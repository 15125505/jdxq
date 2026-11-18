#include "StdAfx.h"
#include "ProcessAction.h"
#include <TlHelp32.h>
#include <Psapi.h>

#pragma comment(lib, "Psapi.lib")

#define Log		LogN(3)
#define Info	LogN(2)
#define Notice	LogN(5)
#define Warn	LogN(7)


namespace Tool 
{


CProcessAction::CProcessAction(void)
{
}

CProcessAction::~CProcessAction(void)
{
}


DWORD CProcessAction::NewProcess(CString strExe, CString strParam)
{
	STARTUPINFO si = { sizeof(si) };
	PROCESS_INFORMATION pi;
	CString strCmd;
	strCmd.Format("\"%s\" %s", strExe, strParam);
	BOOL bRet = ::CreateProcess(
		NULL,
		(LPSTR)(LPCTSTR)strCmd,					//lpszImageName 
		NULL,										//lpsaProcess 
		NULL,										//lpsaThread
		FALSE,										//fInheritHandles
		0,											//fdwCreate
		NULL,										//lpvEnvironment
		NULL,										//lpszCurDir
		&si,										//lpsiStartInfo
		&pi);										//lppiProcInfo
	if (!bRet)
	{
		Warn("启动进程失败：%d", GetLastError());
		return 0;
	}
	return pi.dwProcessId;

}

BOOL CProcessAction::KillProcess(DWORD dwPid)
{
	HANDLE hPrc;  
	if( 0 == dwPid) 
	{
		return FALSE;  
	}
	hPrc = OpenProcess( PROCESS_ALL_ACCESS, FALSE, dwPid);  // Opens handle to the process.  
	if (NULL == hPrc)
	{
		Warn("获取进程句柄失败：%d", GetLastError());
		return FALSE;
	}
	if( !TerminateProcess(hPrc,0) ) // Terminates a process.  
	{  
		Warn("关闭进程失败..0x%X, %d", hPrc, GetLastError());
		CloseHandle( hPrc );  
		return FALSE;  
	}  
	else  
	{
		WaitForSingleObject(hPrc, 2000); // At most ,waite 2000  millisecond.  
	}
	CloseHandle(hPrc);  
	TRACE("关闭进程成功..\n");

	return TRUE;  

}


BOOL CProcessAction::KillProcess(CString strPathName)
{
	// 获取文件名称
	int nPos = strPathName.ReverseFind('\\');
	if (nPos < 0)
	{
		return FALSE;
	}
	strPathName.MakeLower();
	CString strExeName = strPathName.Right(strPathName.GetLength() - nPos - 1);

	// 获取所有进程
	std::map<int, PInfo> mapProcess;
	GetAllProcess(mapProcess);

	// 校验文件名称
	std::set<int> dstProcess;
	for (std::map<int, PInfo>::iterator it = mapProcess.begin(); it != mapProcess.end(); ++it)
	{
		CString strName = it->second.strName.c_str();
		if (strName == strExeName)
		{
			dstProcess.insert(it->first);
		}
	}

	// 校验文件全称，发现目标进程就杀掉
	for (std::set<int>::iterator it=dstProcess.begin(); it!=dstProcess.end(); ++it)
	{
		CString strName;
		GetProcessPath(*it, strName);
		strName.MakeLower();
		if (strName != strPathName)
		{
			continue;
		}
		KillProcessAndChildren(*it);
	}

	return TRUE;
}

BOOL CProcessAction::KillProcessAndChildren(DWORD dwPid)
{
	// 获取所有进程
	std::map<int, PInfo> mapProcess;
	GetAllProcess(mapProcess);


	// 关闭所有的chrome错误进程
	for (std::map<int, PInfo>::iterator it = mapProcess.begin(); it != mapProcess.end(); ++it)
	{
		// 这样的exe需要干掉：e7211bc4-240a-4883-a90a-ff385997d7fb.exe
		CString strName = it->second.strName.c_str();
		BOOL bKill = FALSE;
		if (strName.Replace("-", "a") == 4 && strName.GetLength() > 30)
		{
			bKill = TRUE;
		}

		if (bKill 
			|| it->second.strName.find("WerFault.exe") != std::string::npos 
			|| it->second.strName.find("ChromeCleaner") != std::string::npos  
			|| it->second.strName.find("software_reporter_tool.exe") != std::string::npos)
		{
			Notice("尝试杀掉<%s>", it->second.strName.c_str());
			KillProcess(it->first);
		}
	}


	// 关闭该进程以及所有的子进程
	for (std::map<int, PInfo>::iterator it = mapProcess.begin(); it != mapProcess.end(); ++it)
	{
		if (it->first == dwPid)
		{
			KillProcess(dwPid);
			for (std::set<int>::iterator itSet = it->second.setChildren.begin(); itSet != it->second.setChildren.end(); ++itSet)
			{
				KillProcess(*itSet);
			}
		}
	}
	return TRUE;
}


BOOL CProcessAction::IsTheChild(DWORD dwFather, DWORD dwChild)
{
	if (dwFather == dwChild)
	{
		return TRUE;
	}
	std::map<int, PInfo> mapProcess;
	if (!GetAllProcess(mapProcess))
	{
		return FALSE;
	}
	if (mapProcess.find(dwFather) == mapProcess.end())
	{
		return FALSE;
	}
	const PInfo &info = mapProcess[dwFather];
	return info.setChildren.find(dwChild) != info.setChildren.end();

}

BOOL CProcessAction::GetAllProcess(std::map<int, PInfo> &mapProcess)
{
	PROCESSENTRY32 pe32 = {sizeof(PROCESSENTRY32)};  

	// 创建进程快照
	HANDLE hProcessSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);  
	if(hProcessSnap == INVALID_HANDLE_VALUE) 
	{  
		TRACE("CreateToolhelp32Snapshot Error!\n");
		return FALSE;  
	}  

	// 遍历所有进程
	int num(0);  
	BOOL bResult = Process32First(hProcessSnap, &pe32);  
	while(bResult)   
	{  
		std::string strName = pe32.szExeFile;  
		int nID = pe32.th32ProcessID, nParentId = pe32.th32ParentProcessID;  


		// 添加该节点到map中
		if (mapProcess.find(nID) == mapProcess.end())
		{
			PInfo node;
			node.strName = strName;
			mapProcess[nID] = node;
		}

		// 检查该节点是否属于某个节点的子节点
		for (std::map<int, PInfo>::iterator it = mapProcess.begin(); it != mapProcess.end(); ++it)
		{
			// 如果当前进程的父进程属于该进程，直接加入
			if (nParentId == it->first)
			{
				it->second.setChildren.insert(nID);
			}

			// 如果当前进程的父进程属于该进程的子进程，也需要加入
			if (it->second.setChildren.count(nParentId) > 0)
			{
				it->second.setChildren.insert(nID);
			}
		}

		bResult = Process32Next(hProcessSnap,&pe32);  
	}  
	CloseHandle (hProcessSnap);  

	return TRUE;  
}


CString CProcessAction::GetProcessModule( DWORD dwPID ) 
{ 
	CString strRet;
	HANDLE hModuleSnap = INVALID_HANDLE_VALUE; 
	MODULEENTRY32 me32; 

	//  Take a snapshot of all modules in the specified process. 
	hModuleSnap = CreateToolhelp32Snapshot( TH32CS_SNAPMODULE, dwPID ); 
	if( hModuleSnap == INVALID_HANDLE_VALUE ) 
	{ 
		TRACE( "-- 获取镜像失败 --- %d - %d\n", dwPID, GetLastError() ); 
		return strRet;
	} 

	//  Set the size of the structure before using it. 
	me32.dwSize = sizeof( MODULEENTRY32 ); 

	//  Retrieve information about the first module, 
	//  and exit if unsuccessful 
	if( !Module32First( hModuleSnap, &me32 ) ) 
	{ 
		TRACE( TEXT("Module32First\n") );  // Show cause of failure 
		CloseHandle( hModuleSnap );     // Must clean up the snapshot object! 
		return strRet;
	} 

	strRet = me32.szExePath;

	//  Do not forget to clean up the snapshot object. 
	CloseHandle( hModuleSnap ); 
	return strRet; 
} 


void CProcessAction::GetProcessPath(DWORD dwProcessID, CString &strPath)
{
	TCHAR Filename[MAX_PATH];
	HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, dwProcessID);
	if (hProcess == NULL)
	{
		return;
	}
	HMODULE hModule;
	DWORD cbNeeded;
	if (EnumProcessModules(hProcess, &hModule, sizeof(hModule), &cbNeeded))
	{
		if (GetModuleFileNameEx(hProcess, hModule, Filename, MAX_PATH))
		{
			strPath = Filename;
		}
	}
	else
	{
		DWORD size = MAX_PATH;
		if (QueryFullProcessImageName(hProcess, 0, Filename, &size))
		{
			strPath = Filename;
		}
	}
	CloseHandle(hProcess);
}

}