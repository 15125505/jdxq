
// CefSg.cpp: 定义应用程序的类行为。
//

#include "pch.h"
#include "framework.h"
#include "CefSg.h"
#include "CefSgDlg.h"
#include "CLoadingDlg.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif


// CCefSgApp

BEGIN_MESSAGE_MAP(CCefSgApp, CWinApp)
	ON_COMMAND(ID_HELP, &CWinApp::OnHelp)
END_MESSAGE_MAP()


// CCefSgApp 构造

CCefSgApp::CCefSgApp()
{
	// TODO: 在此处添加构造代码，
	// 将所有重要的初始化放置在 InitInstance 中
}


// 唯一的 CCefSgApp 对象

CCefSgApp theApp;


// CCefSgApp 初始化

BOOL CCefSgApp::InitInstance()
{
	CWinApp::InitInstance();

	CLoadingDlg loading;
	if (loading.DoModal() != IDOK)
	{
		return FALSE;
	}

	CCefSgDlg dlg(loading.GetProcess());
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
		TRACE(traceAppMsg, 0, "警告: 如果您在对话框上使用 MFC 控件，则无法 #define _AFX_NO_MFC_CONTROLS_IN_DIALOGS。\n");
	}


	// 由于对话框已关闭，所以将返回 FALSE 以便退出应用程序，
	//  而不是启动应用程序的消息泵。
	return FALSE;
}

