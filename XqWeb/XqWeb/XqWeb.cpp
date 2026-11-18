
// XqWeb.cpp: 定义应用程序的类行为。
//

#include "pch.h"
#include "framework.h"
#include "XqWeb.h"
#include "XqWebDlg.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


// CXqWebApp

BEGIN_MESSAGE_MAP(CXqWebApp, CWinApp)
	ON_COMMAND(ID_HELP, &CWinApp::OnHelp)
END_MESSAGE_MAP()


// CXqWebApp 构造

CXqWebApp::CXqWebApp()
{
	// TODO: 在此处添加构造代码，
	// 将所有重要的初始化放置在 InitInstance 中
}


// 唯一的 CXqWebApp 对象

CXqWebApp theApp;


// CXqWebApp 初始化

BOOL CXqWebApp::InitInstance()
{
	// 如果一个运行在 Windows XP 上的应用程序清单指定要
	// 使用 ComCtl32.dll 版本 6 或更高版本来启用可视化方式，
	//则需要 InitCommonControlsEx()。  否则，将无法创建窗口。
	INITCOMMONCONTROLSEX InitCtrls;
	InitCtrls.dwSize = sizeof(InitCtrls);
	// 将它设置为包括所有要在应用程序中使用的
	// 公共控件类。
	InitCtrls.dwICC = ICC_WIN95_CLASSES;
	InitCommonControlsEx(&InitCtrls);

	CWinApp::InitInstance();

	CString strUrl = GetUrl();
	if (strUrl.IsEmpty())
	{
		::MessageBox(NULL, "剪切板中未发现有效链接。\n请复制微乐平台的网页地址到剪切板，然后打开本软件。\n本软件用于辅助侦测微乐等网页版本胡莱。\n成功打开胡莱之后，在江东小乔上正常侦测即可。", "江东-战场", MB_ICONINFORMATION);
		return FALSE;
	}



	CXqWebDlg dlg(strUrl);
	m_pMainWnd = &dlg;
	INT_PTR nResponse = dlg.DoModal();
	if (nResponse == IDOK)
	{
		// TODO: 在此放置处理何时用
		//  “确定”来关闭对话框的代码
	}
	else if (nResponse == IDCANCEL)
	{
		// TODO: 在此放置处理何时用
		//  “取消”来关闭对话框的代码
	}
	else if (nResponse == -1)
	{
		TRACE(traceAppMsg, 0, "警告: 对话框创建失败，应用程序将意外终止。\n");
	}


#if !defined(_AFXDLL) && !defined(_AFX_NO_MFC_CONTROLS_IN_DIALOGS)
	ControlBarCleanUp();
#endif

	// 由于对话框已关闭，所以将返回 FALSE 以便退出应用程序，
	//  而不是启动应用程序的消息泵。
	return FALSE;
}

CString CXqWebApp::GetUrl()
{
	// 打开剪贴板  
	if (!OpenClipboard(NULL))
	{
		return "";
	}

	// 判断格式是否是我们所需要  
	if (!IsClipboardFormatAvailable(CF_TEXT))
	{
		CloseClipboard();
		return "";
	}
	HANDLE hClip;
	char* pBuf;

	// 读取数据  
	hClip = GetClipboardData(CF_TEXT);
	pBuf = (char*)GlobalLock(hClip);
	GlobalUnlock(hClip);
	CloseClipboard();

	// 检查数据
	CString str(pBuf);
	if (str.Left(4).MakeLower() != "http")
	{
		return "";
	}

	return str;
}

