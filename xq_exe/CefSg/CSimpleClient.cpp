#include "pch.h"
#include "CSimpleClient.h"
#include "SimpleV8Handler.h"


void OnBeforeDownload(
	CefRefPtr<CefBrowser> browser,
	CefRefPtr<CefDownloadItem> download_item,
	const CefString& suggested_name,
	CefRefPtr<CefBeforeDownloadCallback> callback);
void OnDownloadUpdated(
	CefRefPtr<CefBrowser> browser,
	CefRefPtr<CefDownloadItem> download_item,
	CefRefPtr<CefDownloadItemCallback> callback);

CSimpleClient::CSimpleClient(HWND hWnd)
{
	m_hWnd = hWnd;
}


CSimpleClient::~CSimpleClient()
{
}

void CSimpleClient::OnAfterCreated(CefRefPtr<CefBrowser> browser)
{
	m_cefBrowser = browser;

	TRACE("浏览器被创建了。。。\n");
}

//不弹新对话框
bool CSimpleClient::OnBeforePopup(CefRefPtr<CefBrowser> browser,
	CefRefPtr<CefFrame> frame,
	const CefString& target_url,
	const CefString& target_frame_name,
	WindowOpenDisposition target_disposition,
	bool user_gesture,
	const CefPopupFeatures& popupFeatures,
	CefWindowInfo& windowInfo,
	CefRefPtr<CefClient>& client,
	CefBrowserSettings& settings,
	bool* no_javascript_access)
{
	switch (target_disposition)
	{
	case WOD_NEW_FOREGROUND_TAB:
	case WOD_NEW_BACKGROUND_TAB:
	case WOD_NEW_POPUP:
	case WOD_NEW_WINDOW:
		browser->GetMainFrame()->LoadURL(target_url);
		return true; //cancel create
	}

	return false;
}

//下载功能
void CSimpleClient::OnBeforeDownload(
	CefRefPtr<CefBrowser> browser,
	CefRefPtr<CefDownloadItem> download_item,
	const CefString& suggested_name,
	CefRefPtr<CefBeforeDownloadCallback> callback)
{
	callback->Continue(download_item->GetURL(), true);
}

void CSimpleClient::OnDownloadUpdated(
	CefRefPtr<CefBrowser> browser,
	CefRefPtr<CefDownloadItem> download_item,
	CefRefPtr<CefDownloadItemCallback> callback)
{
	if (download_item->IsComplete())
	{
		AfxMessageBox(_T("下载成功！！！"));
		if (browser->IsPopup() && !browser->HasDocument())
		{
			browser->GetHost()->CloseBrowser(true);
		}
	}

}

void CSimpleClient::OnBeforeCommandLineProcessing(const CefString& process_type, CefRefPtr<CefCommandLine> command_line)
{

	//manifest.json中的version
	command_line->AppendSwitchWithValue("ppapi-flash-version", "192.0.2.1");

	//加载flash插件
	command_line->AppendSwitchWithValue("ppapi-flash-path", "PepperFlash\\pepflashplayer.dll");

	// 去掉网络代理
	command_line->AppendSwitch("no-proxy-server");

}

void CSimpleClient::OnContextCreated(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefV8Context> context)
{
	// The var type can accept all object or variable
	CefRefPtr<CefV8Value> pV8 = context->GetGlobal();

	// bind function 
	CefRefPtr<CSimpleV8Handler> pJsHandler(new CSimpleV8Handler());

	// 创建用于js回调的函数
	CefRefPtr<CefV8Value> pFunc = CefV8Value::CreateFunction(CefString("ToXqWnd"), pJsHandler);
	pV8->SetValue(CefString("ToXqWnd"), pFunc, V8_PROPERTY_ATTRIBUTE_NONE);
}
